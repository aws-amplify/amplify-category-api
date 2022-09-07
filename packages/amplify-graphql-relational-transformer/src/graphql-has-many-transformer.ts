/* eslint-disable no-param-reassign */
import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  InvalidDirectiveError,
  TransformerPluginBase,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
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
import { TransformerPreProcessContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { makeQueryConnectionWithKeyResolver, updateTableForConnection } from './resolvers';
import {
  addFieldsToDefinition,
  convertSortKeyFieldsToSortKeyConnectionFields,
  ensureHasManyConnectionField,
  extendTypeWithConnection,
  getSortKeyFieldsNoContext
} from './schema';
import { HasManyDirectiveConfiguration } from './types';
import {
  ensureFieldsArray, getConnectionAttributeName,
  getFieldsNodes,
  getObjectPrimaryKey,
  getRelatedType,
  getRelatedTypeIndex,
  registerHasManyForeignKeyMappings,
  validateDisallowedDataStoreRelationships,
  validateModelDirective,
  validateRelatedModelDirective,
} from './utils';

const directiveName = 'hasMany';
const defaultLimit = 100;
const directiveDefinition = `
  directive @${directiveName}(indexName: String, fields: [String!], limit: Int = ${defaultLimit}) on FIELD_DEFINITION
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
    const args = directiveWrapped.getArguments({
      directiveName,
      object: parent as ObjectTypeDefinitionNode,
      field: definition,
      directive,
      limit: defaultLimit,
    } as HasManyDirectiveConfiguration, generateGetArgumentsInput(context.featureFlags));

    validate(args, context as TransformerContextProvider);
    this.directiveList.push(args);
  };

  /** During the preProcess step, modify the document node and return it
   * so that it represents any schema modifications the plugin needs
   */
  mutateSchema = (context: TransformerPreProcessContextProvider): DocumentNode => {
    const resultDoc: DocumentNode = produce(context.inputDocument, draftDoc => {
      const connectingFieldsMap = new Map<string, Array<WritableDraft<FieldDefinitionNode>>>(); // key: type name | value: connecting field
      const filteredDefs = draftDoc?.definitions?.filter(def => def.kind === 'ObjectTypeDefinition' || def.kind === 'ObjectTypeExtension');
      const objectDefs = filteredDefs as Array<WritableDraft<ObjectTypeDefinitionNode | ObjectTypeExtensionNode>>;
      // First iteration builds a map of the hasMany connecting fields that need to exist, second iteration ensures they exist
      objectDefs?.forEach(def => {
        const filteredFields = def?.fields?.filter(field => field?.directives?.some(dir => dir.name.value === directiveName));
        filteredFields?.forEach(field => {
          const baseFieldType = getBaseType(field.type);
          const connectionAttributeName = getConnectionAttributeName(
            context.featureFlags,
            def.name.value,
            field.name.value,
            getObjectPrimaryKey(def as ObjectTypeDefinitionNode).name.value,
          );
          const newField = makeField(connectionAttributeName, [], isNonNullType(field.type) ? makeNonNullType(makeNamedType('ID')) : makeNamedType('ID'), []);
          const sortKeyFields = convertSortKeyFieldsToSortKeyConnectionFields(
            getSortKeyFieldsNoContext(def),
            def,
            field,
          );
          const allNewFields = [newField, ...sortKeyFields];
          connectingFieldsMap.set(baseFieldType, allNewFields as Array<WritableDraft<FieldDefinitionNode>>);
        });
      });

      objectDefs?.filter(def => connectingFieldsMap.has(def.name.value))?.forEach(def => {
        const fieldsToAdd = connectingFieldsMap.get(def.name.value);
        if (fieldsToAdd) {
          addFieldsToDefinition(def, fieldsToAdd);
        }
      });
    });
    return resultDoc;
  }

  /**
   * During the prepare step, register any foreign keys that are renamed due to a model rename
   */
  prepare = (context: TransformerPrepareStepContextProvider): void => {
    this.directiveList.forEach(config => {
      registerHasManyForeignKeyMappings({
        featureFlags: context.featureFlags,
        resourceHelper: context.resourceHelper,
        thisTypeName: config.object.name.value,
        thisFieldName: config.field.name.value,
        relatedType: config.relatedType,
      });
    });
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      config.relatedTypeIndex = getRelatedTypeIndex(config, context, config.indexName);
      ensureHasManyConnectionField(config, context);
      extendTypeWithConnection(config, context);
    }
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      updateTableForConnection(config, context);
      makeQueryConnectionWithKeyResolver(config, context);
    }
  };
}

const validate = (config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { field } = config;

  ensureFieldsArray(config);
  validateModelDirective(config);

  if (!isListType(field.type)) {
    throw new InvalidDirectiveError(`@${directiveName} must be used with a list. Use @hasOne for non-list types.`);
  }

  config.fieldNodes = getFieldsNodes(config, ctx);
  config.relatedType = getRelatedType(config, ctx);
  config.connectionFields = [];
  validateRelatedModelDirective(config);
  validateDisallowedDataStoreRelationships(config, ctx);
};
