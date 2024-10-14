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
  TransformerTransformSchemaStepContextProvider, ModelDataSourceStrategyDbType
} from '@aws-amplify/graphql-transformer-interfaces';
import { HasOneDirective } from '@aws-amplify/graphql-directives';
import { Annotations } from 'aws-cdk-lib';
import {
  DirectiveNode, FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  Kind
} from 'graphql';
import {
  isListType
} from 'graphql-transformer-common';
import {
  ensureHasOneConnectionField
} from './schema';
import { HasOneDirectiveConfiguration } from './types';
import {
  getRelatedType,
  validateDisallowedDataStoreRelationships,
  validateModelDirective,
  validateRelatedModelDirective
} from './utils';
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
      // This validation can't occur in validate because the api has not been initialized until generateResolvers
      if (!ctx.transformParameters.allowGen1Patterns) {
        const { field, object } = config;
        const modelName = object.name.value;
        const fieldName = field.name.value;
        if (field.type.kind === Kind.NON_NULL_TYPE) {
          Annotations.of(ctx.api).addWarning(
            `@${HasOneDirective.name} on required fields is deprecated. Modify ${modelName}.${fieldName} to be optional. This functionality will be removed in the next major release.`,
          );
        }
        if (config.fields) {
          Annotations.of(ctx.api).addWarning(
            `fields argument on @${HasOneDirective.name} is deprecated. Modify ${modelName}.${fieldName} to use references instead. This functionality will be removed in the next major release.`,
          );
        }
      }
      const dbType = getStrategyDbTypeFromTypeNode(config.field.type, context);
      const dataSourceBasedTransformer = getHasOneDirectiveTransformer(dbType, config);
      dataSourceBasedTransformer.generateResolvers(ctx, config);
    }
  };
}

const validate = (config: HasOneDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { field } = config;
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
