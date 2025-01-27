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
  ModelDataSourceStrategyDbType,
} from '@aws-amplify/graphql-transformer-interfaces';
import { HasOneDirective } from '@aws-amplify/graphql-directives';
import {
  ArgumentNode,
  DirectiveNode,
  DocumentNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  NamedTypeNode,
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

/**
 * Transformer for @hasOne directive
 */
export class HasOneTransformer extends TransformerPluginBase {
  private directiveList: HasOneDirectiveConfiguration[] = [];

  constructor() {
    super('amplify-has-one-transformer', HasOneDirective.definition);
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
        directiveName: HasOneDirective.name,
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
        const filteredFields = def?.fields?.filter((field) => field?.directives?.some((dir) => dir.name.value === HasOneDirective.name));
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
  const { field, object } = config;
  if (!ctx.transformParameters.allowGen1Patterns) {
    const modelName = object.name.value;
    const fieldName = field.name.value;
    if (field.type.kind === Kind.NON_NULL_TYPE) {
      throw new InvalidDirectiveError(
        `@${HasOneDirective.name} cannot be used on required fields. Modify ${modelName}.${fieldName} to be optional.`,
      );
    }
    if (config.fields) {
      throw new InvalidDirectiveError(
        `fields argument on @${HasOneDirective.name} is disallowed. Modify ${modelName}.${fieldName} to use references instead.`,
      );
    }
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
  const dataSourceBasedTransformer = getHasOneDirectiveTransformer(dbType, config);
  dataSourceBasedTransformer.validate(ctx, config);
  validateModelDirective(config);

  if (isListType(field.type)) {
    throw new InvalidDirectiveError(`@${HasOneDirective.name} cannot be used with lists. Use @hasMany instead.`);
  }

  config.connectionFields = [];
  validateRelatedModelDirective(config);
  validateDisallowedDataStoreRelationships(config, ctx);
};
