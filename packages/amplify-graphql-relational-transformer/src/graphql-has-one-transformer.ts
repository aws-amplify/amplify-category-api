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
import {
  ArgumentNode,
  DirectiveNode,
  DocumentNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeDefinitionNode,
} from 'graphql';
import {
  getBaseType,
  isListType,
  isNonNullType,
  makeArgument,
  makeField,
  makeNamedType,
  makeNonNullType,
  makeValueNode,
} from 'graphql-transformer-common';
import { produce } from 'immer';
import { WritableDraft } from 'immer/dist/types/types-external';
import {
  addFieldsToDefinition,
  convertSortKeyFieldsToSortKeyConnectionFields,
  ensureHasOneConnectionField,
  getSortKeyFieldsNoContext,
} from './schema';
import { HasOneDirectiveConfiguration, ObjectDefinition } from './types';
import {
  getConnectionAttributeName,
  getObjectPrimaryKey,
  getRelatedType,
  validateDisallowedDataStoreRelationships,
  validateModelDirective,
  validateRelatedModelDirective,
} from './utils';
import { getGenerator } from './resolver/generator-factory';
import { getHasOneDirectiveTransformer } from './has-one/has-one-directive-transformer-factory';

const directiveName = 'hasOne';
const directiveDefinition = `
  directive @${directiveName}(fields: [String!], references: [String!]) on FIELD_DEFINITION
`;

/**
 * Transformer for @hasOne directive
 */
export class HasOneTransformer extends TransformerPluginBase {
  private directiveList: HasOneDirectiveConfiguration[] = [];

  constructor() {
    super('amplify-has-one-transformer', directiveDefinition);
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
      } as HasOneDirectiveConfiguration,
      generateGetArgumentsInput(context.transformParameters),
    );

    validate(args, context as TransformerContextProvider);
    this.directiveList.push(args);
  };

  /** During the preProcess step, modify the document node and return it
   * so that it represents any schema modifications the plugin needs
   */
  mutateSchema = (context: TransformerPreProcessContextProvider): DocumentNode => {
    const document: DocumentNode = produce(context.inputDocument, (draftDoc) => {
      const filteredDefs = draftDoc?.definitions?.filter(
        (def) => def.kind === 'ObjectTypeDefinition' || def.kind === 'ObjectTypeExtension',
      );
      const objectDefs = new Map<string, WritableDraft<ObjectDefinition>>(
        (filteredDefs as Array<WritableDraft<ObjectDefinition>>).map((def) => [def.name.value, def]),
      );

      objectDefs?.forEach((def) => {
        const filteredFields = def?.fields?.filter((field) => field?.directives?.some((dir) => dir.name.value === directiveName));
        filteredFields?.forEach((field) => {
          field?.directives?.forEach((dir) => {
            const connectionAttributeName = getConnectionAttributeName(
              context.transformParameters,
              def.name.value,
              field.name.value,
              getObjectPrimaryKey(def as ObjectTypeDefinitionNode).name.value,
            );
            let hasFieldsDefined = false;
            let removalIndex = -1;
            dir?.arguments?.forEach((arg, idx) => {
              if (arg.name.value === 'fields') {
                if (
                  (arg.value.kind === 'StringValue' && arg.value.value) ||
                  (arg.value.kind === 'ListValue' && arg.value.values && arg.value.values.length > 0)
                ) {
                  hasFieldsDefined = true;
                } else {
                  removalIndex = idx;
                }
              }
            });
            if (removalIndex !== -1) {
              dir?.arguments?.splice(removalIndex, 1);
            }
            const relatedType = objectDefs.get(getBaseType(field.type));
            if (!hasFieldsDefined && relatedType) {
              const sortKeyFields = convertSortKeyFieldsToSortKeyConnectionFields(getSortKeyFieldsNoContext(relatedType), def, field);
              const connField = makeField(
                connectionAttributeName,
                [],
                isNonNullType(field.type) ? makeNonNullType(makeNamedType('ID')) : makeNamedType('ID'),
                [],
              ) as WritableDraft<FieldDefinitionNode>;
              // eslint-disable-next-line no-param-reassign
              dir.arguments = [
                makeArgument(
                  'fields',
                  makeValueNode([connectionAttributeName, ...sortKeyFields.map((skf) => skf.name.value)]),
                ) as WritableDraft<ArgumentNode>,
              ];
              addFieldsToDefinition(def, [connField, ...sortKeyFields]);
            }
          });
        });
      });
    });
    return document;
  };

  /**
   * During the prepare step, register any foreign keys that are renamed due to a model rename
   */
  prepare = (context: TransformerPrepareStepContextProvider): void => {
    this.directiveList.forEach((config) => {
      const modelName = config.object.name.value;
      const dbType = getStrategyDbTypeFromModel(context as TransformerContextProvider, modelName);
      const dataSourceBasedTransformer = getHasOneDirectiveTransformer(dbType, config);
      dataSourceBasedTransformer.prepare(context, config);
    });
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      const dbType = getStrategyDbTypeFromTypeNode(config.field.type, context);
      const dataSourceBasedTransformer = getHasOneDirectiveTransformer(dbType, config);
      dataSourceBasedTransformer.transformSchema(ctx, config);
      ensureHasOneConnectionField(config, context);
    }
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      const dbType = getStrategyDbTypeFromTypeNode(config.field.type, context);
      const dataSourceBasedTransformer = getHasOneDirectiveTransformer(dbType, config);
      dataSourceBasedTransformer.generateResolvers(ctx, config);
    }
  };
}

const validate = (config: HasOneDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { field } = config;

  const dbType = getStrategyDbTypeFromTypeNode(field.type, ctx);
  config.relatedType = getRelatedType(config, ctx);
  const dataSourceBasedTransformer = getHasOneDirectiveTransformer(dbType, config);
  dataSourceBasedTransformer.validate(ctx, config);
  validateModelDirective(config);

  if (isListType(field.type)) {
    throw new InvalidDirectiveError(`@${directiveName} cannot be used with lists. Use @hasMany instead.`);
  }

  config.connectionFields = [];
  validateRelatedModelDirective(config);
  validateDisallowedDataStoreRelationships(config, ctx);
};
