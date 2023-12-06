/* eslint-disable no-param-reassign */
import {
  DDB_DB_TYPE,
  DirectiveWrapper,
  generateGetArgumentsInput,
  getStrategyDbTypeFromTypeNode,
  InvalidDirectiveError,
  isSqlDbType,
  TransformerPluginBase,
  isSqlModel,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
  TransformerPreProcessContextProvider,
  ModelDataSourceStrategyDbType,
} from '@aws-amplify/graphql-transformer-interfaces';
import { getBaseType, isListType, isNonNullType, makeField, makeNamedType, makeNonNullType } from 'graphql-transformer-common';
import {
  DirectiveNode,
  DocumentNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
} from 'graphql';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/types/types-external';
import { updateTableForConnection, setFieldMappingResolverReference } from './resolvers';
import {
  addFieldsToDefinition,
  convertSortKeyFieldsToSortKeyConnectionFields,
  ensureHasManyConnectionField,
  extendTypeWithConnection,
  getSortKeyFieldsNoContext,
} from './schema';
import { HasManyDirectiveConfiguration } from './types';
import {
  ensureFieldsArray,
  ensureReferencesArray,
  getConnectionAttributeName,
  getFieldsNodes,
  getObjectPrimaryKey,
  getReferencesNodes,
  getRelatedType,
  getRelatedTypeIndex,
  registerHasManyForeignKeyMappings,
  validateDisallowedDataStoreRelationships,
  validateModelDirective,
  validateParentReferencesFields,
  validateRelatedModelDirective,
} from './utils';
import { getGenerator } from './resolver/generator-factory';

const directiveName = 'hasMany';
const defaultLimit = 100;
const directiveDefinition = `
  directive @${directiveName}(indexName: String, fields: [String!], references: [String!], limit: Int = ${defaultLimit}) on FIELD_DEFINITION
`;

/**
 * Transformer for @hasMany directive
 */
export class HasManyTransformer extends TransformerPluginBase {
  private directiveList: HasManyDirectiveConfiguration[] = [];

  constructor() {
    super('amplify-has-many-transformer', directiveDefinition);
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
        limit: defaultLimit,
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
        const filteredFields = def?.fields?.filter((field) => field?.directives?.some((dir) => dir.name.value === directiveName));
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
      if (isSqlModel(context as TransformerContextProvider, modelName)) {
        setFieldMappingResolverReference(context, config.relatedType?.name?.value, modelName, config.field.name.value, true);
        return;
      }
      registerHasManyForeignKeyMappings({
        transformParameters: context.transformParameters,
        resourceHelper: context.resourceHelper,
        thisTypeName: modelName,
        thisFieldName: config.field.name.value,
        relatedType: config.relatedType,
      });
    });
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      const dbType = getStrategyDbTypeFromTypeNode(config.field.type, context);
      if (dbType === DDB_DB_TYPE) {
        config.relatedTypeIndex = getRelatedTypeIndex(config, context, config.indexName);
      } else if (isSqlDbType(dbType)) {
        validateParentReferencesFields(config, context);
      }
      ensureHasManyConnectionField(config, context);
      extendTypeWithConnection(config, context);
    }
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      const dbType = getStrategyDbTypeFromTypeNode(config.field.type, context);
      if (dbType === DDB_DB_TYPE) {
        updateTableForConnection(config, context);
      }
      makeQueryResolver(config, context, dbType);
    }
  };
}

const makeQueryResolver = (
  config: HasManyDirectiveConfiguration,
  ctx: TransformerContextProvider,
  dbType: ModelDataSourceStrategyDbType,
): void => {
  const generator = getGenerator(dbType);
  generator.makeHasManyGetItemsConnectionWithKeyResolver(config, ctx);
};

const validate = (config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { field } = config;

  const dbType = getStrategyDbTypeFromTypeNode(field.type, ctx);
  config.relatedType = getRelatedType(config, ctx);

  if (dbType === DDB_DB_TYPE) {
    ensureFieldsArray(config);
    config.fieldNodes = getFieldsNodes(config, ctx);
  }

  if (isSqlDbType(dbType)) {
    ensureReferencesArray(config);
    getReferencesNodes(config, ctx);
  }

  validateModelDirective(config);

  if (!isListType(field.type)) {
    throw new InvalidDirectiveError(`@${directiveName} must be used with a list. Use @hasOne for non-list types.`);
  }

  config.connectionFields = [];
  validateRelatedModelDirective(config);
  validateDisallowedDataStoreRelationships(config, ctx);
};
