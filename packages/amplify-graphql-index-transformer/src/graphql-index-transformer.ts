import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  InvalidDirectiveError,
  TransformerPluginBase,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerResolverProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { IndexDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { isListType, isScalarOrEnum } from 'graphql-transformer-common';
import { appendSecondaryIndex, constructSyncVTL, updateResolversForIndex } from './resolvers';
import { addKeyConditionInputs, ensureQueryField, updateMutationConditionInput } from './schema';
import { IndexDirectiveConfiguration } from './types';
import { generateKeyAndQueryNameForConfig, validateNotSelfReferencing } from './utils';

/**
 *
 */
export class IndexTransformer extends TransformerPluginBase {
  private directiveList: IndexDirectiveConfiguration[] = [];

  private resolverMap: Map<TransformerResolverProvider, string> = new Map();

  constructor() {
    super('amplify-index-transformer', IndexDirective.definition);
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
        object: parent as ObjectTypeDefinitionNode,
        field: definition,
        directive,
      } as IndexDirectiveConfiguration,
      generateGetArgumentsInput(context.transformParameters),
    );

    /**
     * Impute Optional Fields
     * Start with sort key fields since both the name and queryField will work sort key fields into the generated name if necessary.
     */
    args.sortKeyFields = getOrGenerateDefaultSortKeyFields(args);
    args.name = getOrGenerateDefaultName(args);
    args.queryField = getOrGenerateDefaultQueryField(context, args);
    args.sortKey = [];

    validate(args, context as TransformerContextProvider);
    this.directiveList.push(args);
  };

  public after = (ctx: TransformerContextProvider): void => {
    if (!ctx.isProjectUsingDataStore()) return;

    // construct sync VTL code
    this.resolverMap.forEach((syncVTLContent, resource) => {
      if (syncVTLContent) {
        constructSyncVTL(syncVTLContent, resource);
      }
    });
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      ensureQueryField(config, context);
      addKeyConditionInputs(config, context);
      updateMutationConditionInput(config, context);
    }
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    for (const config of this.directiveList) {
      appendSecondaryIndex(config, ctx);
      updateResolversForIndex(config, ctx, this.resolverMap);
    }
  };
}

/**
 * Return the name if provided in our args, else
 * compute the name based on the field name, and sortKeyFields.
 */
const getOrGenerateDefaultName = (config: IndexDirectiveConfiguration): string => {
  const indexNameRegex = /^[A-Za-z0-9_\-\.]{3,255}$/;
  if (config.name) {
    if (!indexNameRegex.test(config.name)) {
      throw new Error(
        `The indexName is invalid. It should be between 3 and 255 characters. Only A–Z, a–z, 0–9, underscore characters, hyphens, and periods allowed.`,
      );
    }
    return config.name;
  }

  if (config.name === null) {
    throw new Error('Explicit null value not allowed for name field on @index');
  }

  return generateKeyAndQueryNameForConfig(config);
};

/**
 * Return the queryField if provided in our args, else
 * compute the queryField based on the field name, and sortKeyFields if the feature flag is enabled.
 */
const getOrGenerateDefaultQueryField = (
  context: TransformerSchemaVisitStepContextProvider,
  config: IndexDirectiveConfiguration,
): string | null => {
  const autoIndexQueryNamesIsEnabled = context.transformParameters.enableAutoIndexQueryNames;
  // Any explicit null will take effect, if enableAutoIndexQueryNames and no queryField is provide set to null for consistency
  if (config.queryField === null || (!autoIndexQueryNamesIsEnabled && !config.queryField)) {
    return null;
  }

  if (config.queryField) {
    return config.queryField;
  }

  return generateKeyAndQueryNameForConfig(config);
};

/**
 * sortKeyFields are optional so default to empty list,
 * if we get a raw object just wrap in an array,
 * else return the list which was provided correctly.
 */
const getOrGenerateDefaultSortKeyFields = (config: IndexDirectiveConfiguration): string[] => {
  if (!config.sortKeyFields) {
    return [];
  }
  if (!Array.isArray(config.sortKeyFields)) {
    return [config.sortKeyFields];
  }
  return config.sortKeyFields;
};

const validate = (config: IndexDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { name, object, field, sortKeyFields } = config;
  validateNotSelfReferencing(config);

  const modelDirective = object.directives!.find((directive) => directive.name.value === 'model');

  if (!modelDirective) {
    throw new InvalidDirectiveError(`The @${IndexDirective.name} directive may only be added to object definitions annotated with @model.`);
  }

  config.modelDirective = modelDirective;

  const fieldMap = new Map<string, FieldDefinitionNode>();

  for (const objectField of object.fields!) {
    fieldMap.set(objectField.name.value, objectField);

    for (const peerDirective of objectField.directives!) {
      if (peerDirective === config.directive) {
        continue;
      }

      if (peerDirective.name.value === 'primaryKey') {
        const hasSortFields = peerDirective.arguments!.some(
          (arg: any) => arg.name.value === 'sortKeyFields' && arg.value.values?.length > 0,
        );
        config.primaryKeyField = objectField;

        if (!hasSortFields && objectField.name.value === field.name.value) {
          throw new InvalidDirectiveError(
            `Invalid @index '${name}'. You may not create an index where the partition key ` +
              'is the same as that of the primary key unless the primary key has a sort field. ' +
              'You cannot have a local secondary index without a sort key in the primary key.',
          );
        }
      }

      if (
        peerDirective.name.value === IndexDirective.name &&
        peerDirective.arguments!.some((arg: any) => arg.name.value === 'name' && arg.value.value === name)
      ) {
        throw new InvalidDirectiveError(
          `You may only supply one @${IndexDirective.name} with the name '${name}' on type '${object.name.value}'.`,
        );
      }
    }

    for (const peerDirective of objectField.directives!) {
      const hasSortFields = peerDirective.arguments!.some((arg: any) => arg.name.value === 'sortKeyFields' && arg.value.values?.length > 0);

      if (
        !ctx.transformParameters.secondaryKeyAsGSI &&
        !hasSortFields &&
        objectField == config.primaryKeyField &&
        objectField.name.value === field.name.value
      ) {
        throw new InvalidDirectiveError(
          `Invalid @index '${name}'. You may not create an index where the partition key ` +
            'is the same as that of the primary key unless the index has a sort field. ' +
            'You cannot have a local secondary index without a sort key in the index.',
        );
      }
    }
  }

  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];

  if (!isScalarOrEnum(field.type, enums) || isListType(field.type)) {
    throw new InvalidDirectiveError(`Index '${name}' on type '${object.name.value}.${field.name.value}' cannot be a non-scalar.`);
  }

  for (const sortKeyFieldName of sortKeyFields) {
    const sortField = fieldMap.get(sortKeyFieldName);

    if (!sortField) {
      throw new InvalidDirectiveError(
        `Can't find field '${sortKeyFieldName}' in ${object.name.value}, but it was specified in index '${name}'.`,
      );
    }

    if (!isScalarOrEnum(sortField.type, enums) || isListType(sortField.type)) {
      throw new InvalidDirectiveError(
        `The sort key of index '${name}' on type '${object.name.value}.${sortField.name.value}' cannot be a non-scalar.`,
      );
    }

    config.sortKey.push(sortField);
  }
};
