/* eslint-disable no-param-reassign */
import { HasManyDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveWrapper,
  InvalidDirectiveError,
  TransformerPluginBase,
  generateGetArgumentsInput,
  getStrategyDbTypeFromModel,
  getStrategyDbTypeFromTypeNode,
} from '@aws-amplify/graphql-transformer-core';
import {
  ModelDataSourceStrategy,
  ModelDataSourceStrategyDbType,
  TransformerContextProvider,
  TransformerPreProcessContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  DirectiveNode,
  DocumentNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  Kind,
} from 'graphql';
import { getBaseType, isListType, isNonNullType, makeField, makeNamedType, makeNonNullType } from 'graphql-transformer-common';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/types/types-external';
import { getHasManyDirectiveTransformer } from './has-many/has-many-directive-transformer-factory';
import {
  addFieldsToDefinition,
  convertSortKeyFieldsToSortKeyConnectionFields,
  ensureHasManyConnectionField,
  extendTypeWithConnection,
  getSortKeyFieldsNoContext,
} from './schema';
import { HasManyDirectiveConfiguration } from './types';
import {
  getConnectionAttributeName,
  getObjectPrimaryKey,
  getRelatedType,
  validateDisallowedDataStoreRelationships,
  validateModelDirective,
  validateRelatedModelDirective,
} from './utils';

export class HasManyTransformer extends TransformerPluginBase {
  private directiveList: HasManyDirectiveConfiguration[] = [];

  constructor() {
    super('amplify-has-many-transformer', HasManyDirective.definition);
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
        directiveName: HasManyDirective.name,
        object: parent as ObjectTypeDefinitionNode,
        field: definition,
        directive,
        limit: HasManyDirective.defaults.limit,
      } as HasManyDirectiveConfiguration,
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
      const connectingFieldsMap = new Map<string, Array<WritableDraft<FieldDefinitionNode>>>(); // key: type name | value: connecting field
      const filteredDefs = draftDoc?.definitions?.filter(
        (def) => def.kind === 'ObjectTypeDefinition' || def.kind === 'ObjectTypeExtension',
      );
      const objectDefs = filteredDefs as Array<WritableDraft<ObjectTypeDefinitionNode | ObjectTypeExtensionNode>>;
      // First iteration builds a map of the hasMany connecting fields that need to exist, second iteration ensures they exist
      objectDefs?.forEach((def) => {
        const filteredFields = def?.fields?.filter((field) => field?.directives?.some((dir) => dir.name.value === HasManyDirective.name));
        filteredFields?.forEach((field) => {
          const baseFieldType = getBaseType(field.type);
          const connectionAttributeName = getConnectionAttributeName(
            context.transformParameters,
            def.name.value,
            field.name.value,
            getObjectPrimaryKey(def as ObjectTypeDefinitionNode).name.value,
          );
          const newField = makeField(
            connectionAttributeName,
            [],
            isNonNullType(field.type) ? makeNonNullType(makeNamedType('ID')) : makeNamedType('ID'),
            [],
          );
          const sortKeyFields = convertSortKeyFieldsToSortKeyConnectionFields(getSortKeyFieldsNoContext(def), def, field);
          const allNewFields = [newField, ...sortKeyFields];
          connectingFieldsMap.set(baseFieldType, allNewFields as Array<WritableDraft<FieldDefinitionNode>>);
        });
      });

      objectDefs
        ?.filter((def) => connectingFieldsMap.has(def.name.value))
        ?.forEach((def) => {
          const fieldsToAdd = connectingFieldsMap.get(def.name.value);
          if (fieldsToAdd) {
            addFieldsToDefinition(def, fieldsToAdd);
          }
        });
    });
    return resultDoc;
  };

  /**
   * During the prepare step, register any foreign keys that are renamed due to a model rename
   */
  prepare = (context: TransformerPrepareStepContextProvider): void => {
    this.directiveList.forEach((config) => {
      const modelName = config.object.name.value;
      const dbType = getStrategyDbTypeFromModel(context as TransformerContextProvider, modelName);
      const dataSourceBasedTransformer = getHasManyDirectiveTransformer(dbType, config);
      dataSourceBasedTransformer.prepare(context, config);
    });
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      const dbType = getStrategyDbTypeFromTypeNode(config.field.type, context);
      const dataSourceBasedTransformer = getHasManyDirectiveTransformer(dbType, config);
      dataSourceBasedTransformer.transformSchema(ctx, config);
      ensureHasManyConnectionField(config, context);
      extendTypeWithConnection(config, context);
    }
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      const dbType = getStrategyDbTypeFromTypeNode(config.field.type, context);
      const dataSourceBasedTransformer = getHasManyDirectiveTransformer(dbType, config);
      dataSourceBasedTransformer.generateResolvers(ctx, config);
    }
  };
}

const validate = (config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { field, object } = config;
  if (!ctx.transformParameters.allowGen1Patterns) {
    const modelName = object.name.value;
    const fieldName = field.name.value;
    if (field.type.kind === Kind.NON_NULL_TYPE) {
      throw new InvalidDirectiveError(
        `@${HasManyDirective.name} cannot be used on required fields. Modify ${modelName}.${fieldName} to be optional.`,
      );
    }
    if (config.fields) {
      throw new InvalidDirectiveError(
        `fields argument on @${HasManyDirective.name} is deprecated. Modify ${modelName}.${fieldName} to use references instead.`,
      );
    }
  }

  if (!isListType(field.type)) {
    throw new InvalidDirectiveError(`@${HasManyDirective.name} must be used with a list. Use @hasOne for non-list types.`);
  }

  let dbType: ModelDataSourceStrategyDbType;
  try {
    // getStrategyDbTypeFromTypeNode throws if a datasource is not found for the model. We want to catch that condition
    // here to provide a friendlier error message, since the most likely error scenario is that the customer neglected to annotate one
    // of the types with `@model`.
    // Since this transformer gets invoked on both sides of the `belongsTo` relationship, a failure at this point is about the
    // field itself, not the related type.
    dbType = getStrategyDbTypeFromTypeNode(field.type, ctx);
  } catch {
    throw new InvalidDirectiveError(
      `Object type ${(field.type as NamedTypeNode)?.name.value ?? field.name} must be annotated with @model.`,
    );
  }

  config.relatedType = getRelatedType(config, ctx);

  const dataSourceBasedTransformer = getHasManyDirectiveTransformer(dbType, config);
  dataSourceBasedTransformer.validate(ctx, config);
  validateModelDirective(config);

  config.connectionFields = [];
  validateRelatedModelDirective(config);
  validateDisallowedDataStoreRelationships(config, ctx);
};
