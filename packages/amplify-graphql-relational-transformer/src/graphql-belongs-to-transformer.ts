/* eslint-disable no-param-reassign */
import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  getModelDataSourceStrategyForType,
  InvalidDirectiveError,
  TransformerPluginBase,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
  TransformerPreProcessContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, DocumentNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import {
  getBaseType,
  getModelDataSourceStrategy,
  isDynamoDbStrategy,
  isListType,
  isNonNullType,
  isSqlModel,
  isSqlStrategy,
  makeField,
  makeNamedType,
  makeNonNullType,
} from 'graphql-transformer-common';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/types/types-external';
import { ensureBelongsToConnectionField } from './schema';
import { BelongsToDirectiveConfiguration, ObjectDefinition } from './types';
import {
  ensureFieldsArray,
  ensureReferencesArray,
  getBelongsToReferencesNodes,
  getConnectionAttributeName,
  getFieldsNodes,
  getObjectPrimaryKey,
  getRelatedType,
  getRelatedTypeIndex,
  registerHasOneForeignKeyMappings,
  validateChildReferencesFields,
  validateModelDirective,
  validateRelatedModelDirective,
} from './utils';
import { getGenerator } from './resolver/generator-factory';
import { setFieldMappingResolverReference } from './resolvers';

const directiveName = 'belongsTo';
const directiveDefinition = `
  directive @${directiveName}(fields: [String!], references: [String!]) on FIELD_DEFINITION
`;

/**
 * Transformer for @belongsTo directive
 */
export class BelongsToTransformer extends TransformerPluginBase {
  private directiveList: BelongsToDirectiveConfiguration[] = [];

  constructor() {
    super('amplify-belongs-to-transformer', directiveDefinition);
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveWrapped = new DirectiveWrapper(directive);
    const args = directiveWrapped.getArguments(
      {
        directiveName,
        object: parent as ObjectTypeDefinitionNode,
        field: definition,
        directive,
      } as BelongsToDirectiveConfiguration,
      generateGetArgumentsInput(context.transformParameters),
    );

    validate(args, context as TransformerContextProvider);
    this.directiveList.push(args);
  };

  /** During the preProcess step, modify the document node and return it
   * so that it represents any schema modifications the plugin needs
   */
  mutateSchema = (context: TransformerPreProcessContextProvider): DocumentNode => {
    const resultDoc: DocumentNode = produce(context.inputDocument, (draftDoc) => {
      const objectTypeMap = new Map<string, WritableDraft<ObjectDefinition>>(); // key: type name | value: object type node
      // First iteration builds a map of the object types to reference for relation types
      const filteredDefs = draftDoc?.definitions?.filter(
        (def) => def.kind === 'ObjectTypeExtension' || def.kind === 'ObjectTypeDefinition',
      );
      const objectDefs = filteredDefs as Array<WritableDraft<ObjectDefinition>>;
      objectDefs?.forEach((def) => objectTypeMap.set(def.name.value, def));

      objectDefs?.forEach((def) => {
        const filteredFields = def?.fields?.filter((field) =>
          field?.directives?.some((dir) => dir.name.value === directiveName && objectTypeMap.get(getBaseType(field.type))),
        );
        filteredFields?.forEach((field) => {
          const relatedType = objectTypeMap.get(getBaseType(field.type));
          const relationTypeField = relatedType?.fields?.find(
            (relatedField) =>
              getBaseType(relatedField.type) === def.name.value &&
              relatedField?.directives?.some((relatedDir) => relatedDir.name.value === 'hasOne' || relatedDir.name.value === 'hasMany'),
          );
          const relationTypeName = relationTypeField?.directives?.find(
            (relationDir) => relationDir.name.value === 'hasOne' || relationDir.name.value === 'hasMany',
          )?.name?.value;

          if (relationTypeName === 'hasOne') {
            const connectionAttributeName = getConnectionAttributeName(
              context.transformParameters,
              def.name.value,
              field.name.value,
              getObjectPrimaryKey(def as ObjectTypeDefinitionNode).name.value,
            );
            if (!def?.fields?.some((defField) => defField.name.value === connectionAttributeName)) {
              def?.fields?.push(
                makeField(
                  connectionAttributeName,
                  [],
                  isNonNullType(field.type) ? makeNonNullType(makeNamedType('ID')) : makeNamedType('ID'),
                  [],
                ) as WritableDraft<FieldDefinitionNode>,
              );
            }
          }
        });
      });
    });
    return resultDoc;
  };

  /**
   * During the prepare step, register any foreign keys that are renamed due to a model rename
   */
  prepare = (context: TransformerPrepareStepContextProvider): void => {
    this.directiveList
      .filter((config) => config.relationType === 'hasOne')
      .forEach((config) => {
        const modelName = config.object.name.value;
        if (isSqlModel(context as TransformerContextProvider, modelName)) {
          return;
        }
        // a belongsTo with hasOne behaves the same as hasOne
        registerHasOneForeignKeyMappings({
          transformParameters: context.transformParameters,
          resourceHelper: context.resourceHelper,
          thisTypeName: modelName,
          thisFieldName: config.field.name.value,
          relatedType: config.relatedType,
        });
      });
    setFieldMappingReferences(context, this.directiveList);
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      const strategy = getModelDataSourceStrategyForType(config.field.type, context);
      if (isDynamoDbStrategy(strategy)) {
        config.relatedTypeIndex = getRelatedTypeIndex(config, context);
      } else if (isSqlStrategy(strategy)) {
        validateChildReferencesFields(config, context);
      }
      ensureBelongsToConnectionField(config, context);
    }
  };

  /**
   * Generates a resolver for the RELATED types of directives in the list.
   */
  generateResolvers = (ctx: TransformerContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      const relatedType = getRelatedType(config, ctx);
      const strategyOfRelatedType = getModelDataSourceStrategy(ctx, relatedType.name.value);
      const generator = getGenerator(strategyOfRelatedType.dbType);
      generator.makeBelongsToGetItemConnectionWithKeyResolver(config, context);
    }
  };
}

const validate = (config: BelongsToDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { field, object } = config;

  const strategy = getModelDataSourceStrategyForType(field.type, ctx);
  config.relatedType = getRelatedType(config, ctx);

  if (isDynamoDbStrategy(strategy)) {
    ensureFieldsArray(config);
    config.fieldNodes = getFieldsNodes(config, ctx);
  }

  if (isSqlStrategy(strategy)) {
    ensureReferencesArray(config);
    getBelongsToReferencesNodes(config, ctx);
  }

  validateModelDirective(config);

  if (isListType(field.type)) {
    throw new InvalidDirectiveError(`@${directiveName} cannot be used with lists.`);
  }

  config.connectionFields = [];
  validateRelatedModelDirective(config);

  const isBiRelation = config.relatedType.fields!.some((relatedField) => {
    if (getBaseType(relatedField.type) !== object.name.value) {
      return false;
    }

    return relatedField.directives!.some((relatedDirective) => {
      if (relatedDirective.name.value === 'hasOne' || relatedDirective.name.value === 'hasMany') {
        config.relatedField = relatedField;
        config.relationType = relatedDirective.name.value;
        return true;
      }
      return false;
    });
  });

  if (!isBiRelation && isDynamoDbStrategy(strategy)) {
    throw new InvalidDirectiveError(
      `${config.relatedType.name.value} must have a relationship with ${object.name.value} in order to use @${directiveName}.`,
    );
  }
};

const setFieldMappingReferences = (
  context: TransformerPrepareStepContextProvider,
  directiveList: BelongsToDirectiveConfiguration[],
): void => {
  directiveList.forEach((config) => {
    const modelName = config.object.name.value;
    const areFieldMappingsSupported = isSqlModel(context as TransformerContextProvider, modelName);
    if (!areFieldMappingsSupported) {
      return;
    }
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value);
  });
};
