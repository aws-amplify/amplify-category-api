/* eslint-disable no-param-reassign */
import {
  DDB_DB_TYPE,
  DirectiveWrapper,
  generateGetArgumentsInput,
  getStrategyDbTypeFromTypeNode,
  InvalidDirectiveError,
  TransformerPluginBase,
  isSqlModel,
  isSqlDbType,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
  TransformerPreProcessContextProvider,
  ModelDataSourceStrategyDbType,
} from '@aws-amplify/graphql-transformer-interfaces';
import { BelongsToDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveNode,
  DocumentNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { getBaseType, isListType, isNonNullType, makeField, makeNamedType, makeNonNullType } from 'graphql-transformer-common';
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

/**
 * Transformer for @belongsTo directive
 */
export class BelongsToTransformer extends TransformerPluginBase {
  private directiveList: BelongsToDirectiveConfiguration[] = [];

  constructor() {
    super('amplify-belongs-to-transformer', BelongsToDirective.definition);
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
        directiveName: BelongsToDirective.name,
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
          field?.directives?.some((dir) => dir.name.value === BelongsToDirective.name && objectTypeMap.get(getBaseType(field.type))),
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
      const dbType = getStrategyDbTypeFromTypeNode(config.field.type, context);
      if (dbType === DDB_DB_TYPE) {
        config.relatedTypeIndex = getRelatedTypeIndex(config, context);
      } else if (isSqlDbType(dbType)) {
        validateChildReferencesFields(config, context);
      }
      ensureBelongsToConnectionField(config, context);
    }
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      const dbType = getStrategyDbTypeFromTypeNode(config.field.type, context);
      const generator = getGenerator(dbType);
      generator.makeBelongsToGetItemConnectionWithKeyResolver(config, context);
    }
  };
}

const validate = (config: BelongsToDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { field, object } = config;

  let dbType: ModelDataSourceStrategyDbType;
  try {
    // getStrategyDbTypeFromTypeNode throws if a datasource is not found for the model. We want to catch that condition here to provide a friendlier
    // error message, since the most likely error scenario is that the customer neglected to annotate one of the types with `@model`. Since
    // this transformer gets invoked on both sides of the `belongsTo` relationship, a failure at this point is about the field itself, not
    // the related type.
    dbType = getStrategyDbTypeFromTypeNode(field.type, ctx);
  } catch {
    throw new InvalidDirectiveError(
      `Object type ${(field.type as NamedTypeNode)?.name.value ?? field.name} must be annotated with @model.`,
    );
  }

  config.relatedType = getRelatedType(config, ctx);
  if (dbType === DDB_DB_TYPE) {
    ensureFieldsArray(config);
    config.fieldNodes = getFieldsNodes(config, ctx);
  }

  if (isSqlDbType(dbType)) {
    ensureReferencesArray(config);
    getBelongsToReferencesNodes(config, ctx);
  }

  validateModelDirective(config);

  if (isListType(field.type)) {
    throw new InvalidDirectiveError(`@${BelongsToDirective.name} cannot be used with lists.`);
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

  if (!isBiRelation && dbType === DDB_DB_TYPE) {
    throw new InvalidDirectiveError(
      `${config.relatedType.name.value} must have a relationship with ${object.name.value} in order to use @${BelongsToDirective.name}.`,
    );
  }
};

const setFieldMappingReferences = (context: TransformerPrepareStepContextProvider, directiveList: BelongsToDirectiveConfiguration[]) => {
  directiveList.forEach((config) => {
    const modelName = config.object.name.value;
    const areFieldMappingsSupported = isSqlModel(context as TransformerContextProvider, modelName);
    if (!areFieldMappingsSupported) {
      return;
    }
    setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value);
  });
};
