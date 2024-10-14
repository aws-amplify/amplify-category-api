/* eslint-disable no-param-reassign */
import {
  DDB_DB_TYPE,
  DirectiveWrapper,
  InvalidDirectiveError,
  TransformerPluginBase,
  generateGetArgumentsInput,
  getStrategyDbTypeFromModel,
  getStrategyDbTypeFromTypeNode,
} from '@aws-amplify/graphql-transformer-core';
import {
  ModelDataSourceStrategyDbType,
  TransformerContextProvider, TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider
} from '@aws-amplify/graphql-transformer-interfaces';
import { BelongsToDirective } from '@aws-amplify/graphql-directives';
import { Annotations } from 'aws-cdk-lib';
import {
  DirectiveNode, FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  Kind
} from 'graphql';
import { getBaseType, isListType } from 'graphql-transformer-common';
import { getBelongsToDirectiveTransformer } from './belongs-to/belongs-to-directive-transformer-factory';
import { ensureBelongsToConnectionField } from './schema';
import { BelongsToDirectiveConfiguration } from './types';
import {
  getRelatedType,
  validateModelDirective,
  validateRelatedModelDirective
} from './utils';

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

  /**
   * During the prepare step, register any foreign keys that are renamed due to a model rename
   */
  prepare = (context: TransformerPrepareStepContextProvider): void => {
    this.directiveList.forEach((config) => {
      const modelName = config.object.name.value;
      const dbType = getStrategyDbTypeFromModel(context as TransformerContextProvider, modelName);
      const dataSourceBasedTransformer = getBelongsToDirectiveTransformer(dbType, config);
      dataSourceBasedTransformer.prepare(context, config);
    });
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      const dbType = getStrategyDbTypeFromTypeNode(config.field.type, context);
      const dataSourceBasedTransformer = getBelongsToDirectiveTransformer(dbType, config);
      dataSourceBasedTransformer.transformSchema(ctx, config);
      ensureBelongsToConnectionField(config, context);
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
            `@${BelongsToDirective.name} on required fields is deprecated. Modify ${modelName}.${fieldName} to be optional. This functionality will be removed in the next major release.`,
          );
        }
        if (config.fields) {
          Annotations.of(ctx.api).addWarning(
            `fields argument on @${BelongsToDirective.name} is deprecated. Modify ${modelName}.${fieldName} to use references instead. This functionality will be removed in the next major release.`,
          );
        }
      }
      const dbType = getStrategyDbTypeFromTypeNode(config.field.type, context);
      const dataSourceBasedTransformer = getBelongsToDirectiveTransformer(dbType, config);
      dataSourceBasedTransformer.generateResolvers(ctx, config);
    }
  };
}

const validate = (config: BelongsToDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { field, object } = config;
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
  const dataSourceBasedTransformer = getBelongsToDirectiveTransformer(dbType, config);
  dataSourceBasedTransformer.validate(ctx, config);
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
