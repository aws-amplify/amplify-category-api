/* eslint-disable no-param-reassign */
import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  getStrategyDbTypeFromTypeNode,
  getStrategyDbTypeFromModel,
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
import { HasManyDirective } from '@aws-amplify/graphql-directives';
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
import { getGenerator } from './resolver/generator-factory';
import { getHasManyDirectiveTransformer } from './has-many/has-many-directive-transformer-factory';

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
    // TODO: Split out fields and references based logic
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
  const { field } = config;

  const dbType = getStrategyDbTypeFromTypeNode(field.type, ctx);
  config.relatedType = getRelatedType(config, ctx);

  const dataSourceBasedTransformer = getHasManyDirectiveTransformer(dbType, config);
  dataSourceBasedTransformer.validate(ctx, config);
  validateModelDirective(config);

  if (!isListType(field.type)) {
    throw new InvalidDirectiveError(`@${HasManyDirective.name} must be used with a list. Use @hasOne for non-list types.`);
  }

  config.connectionFields = [];
  validateRelatedModelDirective(config);
  validateDisallowedDataStoreRelationships(config, ctx);
};
