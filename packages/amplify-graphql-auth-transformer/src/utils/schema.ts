import { ModelDirectiveConfiguration, SubscriptionLevel } from '@aws-amplify/graphql-model-transformer';
import { getConnectionAttributeName, getSortKeyConnectionAttributeName } from '@aws-amplify/graphql-relational-transformer';
import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  getKeySchema,
  getSortKeyFieldNames,
  getTable,
  InvalidDirectiveError,
} from '@aws-amplify/graphql-transformer-core';
import {
  QueryFieldType,
  MutationFieldType,
  TransformerTransformSchemaStepContextProvider,
  TransformerContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode, FieldDefinitionNode, DirectiveNode, NamedTypeNode, ObjectTypeExtensionNode } from 'graphql';
import {
  blankObjectExtension,
  extendFieldWithDirectives,
  extensionWithDirectives,
  graphqlName,
  isListType,
  makeInputValueDefinition,
  makeNamedType,
  plurality,
  toCamelCase,
  toUpper,
} from 'graphql-transformer-common';
import md5 from 'md5';
import { RELATIONAL_DIRECTIVES } from './constants';
import { RelationalPrimaryMapConfig, SearchableConfig } from './definitions';
import { RoleDefinition } from './role-definition';

/**
 * Return an array of the field names in `object`
 */
export const collectFieldNames = (object: ObjectTypeDefinitionNode | ObjectTypeExtensionNode): Array<string> =>
  object.fields!.map((field: FieldDefinitionNode) => field.name.value);

/**
 * Return true if the `fieldName` element of `fields` is a list type.
 */
export const fieldIsList = (fields: ReadonlyArray<FieldDefinitionNode>, fieldName: string): boolean =>
  fields.some((field) => field.name.value === fieldName && isListType(field.type));

/**
 * Construct a {@link ModelDirectiveConfiguration} for the specified typeName.
 */
export const getModelConfig = (
  directive: DirectiveNode,
  typeName: string,
  transformParameters: TransformParameters,
  isDataStoreEnabled = false,
): ModelDirectiveConfiguration => {
  const directiveWrapped: DirectiveWrapper = new DirectiveWrapper(directive);
  const options = directiveWrapped.getArguments<ModelDirectiveConfiguration>(
    {
      queries: {
        get: toCamelCase(['get', typeName]),
        list: toCamelCase(['list', plurality(typeName, true)]),
        ...(isDataStoreEnabled ? { sync: toCamelCase(['sync', plurality(typeName, true)]) } : undefined),
      },
      mutations: {
        create: toCamelCase(['create', typeName]),
        update: toCamelCase(['update', typeName]),
        delete: toCamelCase(['delete', typeName]),
      },
      subscriptions: {
        level: SubscriptionLevel.on,
        onCreate: [ensureValidSubscriptionName(toCamelCase(['onCreate', typeName]))],
        onDelete: [ensureValidSubscriptionName(toCamelCase(['onDelete', typeName]))],
        onUpdate: [ensureValidSubscriptionName(toCamelCase(['onUpdate', typeName]))],
      },
      timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    },
    generateGetArgumentsInput(transformParameters),
  );
  return options;
};

/**
 * getSearchableConfig
 */
export const getSearchableConfig = (
  directive: DirectiveNode,
  typeName: string,
  transformParameters: TransformParameters,
): SearchableConfig | null => {
  const directiveWrapped: DirectiveWrapper = new DirectiveWrapper(directive);
  const options = directiveWrapped.getArguments<SearchableConfig>(
    {
      queries: {
        search: graphqlName(`search${plurality(toUpper(typeName), true)}`),
      },
    },
    generateGetArgumentsInput(transformParameters),
  );
  return options;
};

/*
 This handles the scenario where a @auth field is also included in the key schema of a related @model
 since a filter expression cannot contain partition key or sort key attributes. We need to run auth on the query expression
 https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.FilterExpression
 @hasMany
 - we get the key schema (default or provided index) and then check that against the fields provided in the argument
 - we then create a map of this relation if the field is included in the directive then we use ctx.source.relatedField
   otherwise we use ctx.args.relatedField
 @hasOne, @belongsTo
 - we check the key schema against the fields provided by the directive
 - if they don't have the same length then we throw an error
 - All of the fields specified are checked against the ctx.source.relatedField
   since this isn't a many relational we don't need to get values from ctx.args
 */
export const getRelationalPrimaryMap = (
  ctx: TransformerContextProvider,
  def: ObjectTypeDefinitionNode,
  field: FieldDefinitionNode,
  relatedModel: ObjectTypeDefinitionNode,
): RelationalPrimaryMapConfig => {
  const relationalDirective = field.directives.find((dir) => RELATIONAL_DIRECTIVES.includes(dir.name.value));
  const directiveWrapped: DirectiveWrapper = new DirectiveWrapper(relationalDirective);
  const primaryFieldMap = new Map();
  if (relationalDirective.name.value === 'hasMany') {
    const args = directiveWrapped.getArguments(
      {
        indexName: undefined,
        fields: undefined,
      },
      generateGetArgumentsInput(ctx.transformParameters),
    );

    // we only generate a primary map if a index name or field is specified
    // if both are undefined then @hasMany will create a new gsi with a new readonly field
    // we don't need a primary map since this readonly field is not a auth field
    if (args.indexName || args.fields) {
      // get related types key schema
      const fields = args.fields ? args.fields : [getTable(ctx, def).keySchema.find((att: any) => att.keyType === 'HASH').attributeName];
      const relatedTable = args.indexName
        ? (getKeySchema(getTable(ctx, relatedModel), args.indexName).map((att: any) => att.attributeName) as Array<string>)
        : getKeyFields(ctx, relatedModel);
      relatedTable.forEach((att, idx) => {
        primaryFieldMap.set(att, {
          claim: fields[idx] ? 'source' : 'args',
          field: fields[idx] ?? att,
        });
      });
    }
  } // manyToMany doesn't need a primaryMap since it will create it's own gsis
  // to the join table between related @models
  else if (relationalDirective.name.value !== 'manyToMany') {
    const args = directiveWrapped.getArguments(
      {
        fields: [
          getConnectionAttributeName(ctx.transformParameters, def.name.value, field.name.value, relatedModel.name.value),
          ...getSortKeyFieldNames(relatedModel).map((it) => getSortKeyConnectionAttributeName(def.name.value, field.name.value, it)),
        ],
      },
      generateGetArgumentsInput(ctx.transformParameters),
    );
    const relatedPrimaryFields = getKeyFields(ctx, relatedModel);

    // the fields provided by the directive (implicit/explicit) need to match the total amount of fields used for the primary key in the
    // related table otherwise the get request is incomplete
    if (args.fields.length !== relatedPrimaryFields.length) {
      throw new InvalidDirectiveError(
        `Invalid @${relationalDirective.name.value} on ${def.name.value}:${field.name.value}. ` +
          `Provided fields do not match the size of primary key(s) for ${relatedModel.name.value}`,
      );
    }
    relatedPrimaryFields.forEach((relatedPrimaryField, idx) => {
      primaryFieldMap.set(relatedPrimaryField, {
        claim: 'source',
        field: args.fields[idx],
      });
    });
  }
  return primaryFieldMap;
};

/**
 * Return true if the specified field has any relational directive (hasOne, hasMany, belongsTo, manyToMany)
 */
export const hasRelationalDirective = (field: FieldDefinitionNode): boolean =>
  field.directives && field.directives.some((dir) => RELATIONAL_DIRECTIVES.includes(dir.name.value));

/**
 * Given the keySchema from a DynamoDBDataSource, return the partitionKey
 */
export const getPartitionKey = (ks: any): string => ks.find((att: any) => att.keyType === 'HASH')!.attributeName;

/**
 * Create a new extension type for `typeName`, and adds the specified directives to it. Mutates the relevant output objects of `ctx`.
 */
export const extendTypeWithDirectives = (
  ctx: TransformerTransformSchemaStepContextProvider,
  typeName: string,
  directives: Array<DirectiveNode>,
): void => {
  let objectTypeExtension = blankObjectExtension(typeName);
  objectTypeExtension = extensionWithDirectives(objectTypeExtension, directives);
  ctx.output.addObjectExtension(objectTypeExtension);
};

/**
 * Add the specified directives to `{typeName}.{fieldName}`. Mutates the relevant output objects of `ctx`.
 */
export const addDirectivesToField = (
  ctx: TransformerTransformSchemaStepContextProvider,
  typeName: string,
  fieldName: string,
  directives: Array<DirectiveNode>,
): void => {
  const type = ctx.output.getType(typeName) as ObjectTypeDefinitionNode;
  if (type) {
    const field = type.fields?.find((f) => f.name.value === fieldName);
    if (field) {
      const newFields = [...type.fields!.filter((f) => f.name.value !== field.name.value), extendFieldWithDirectives(field, directives)];

      const newType = {
        ...type,
        fields: newFields,
      };

      ctx.output.putType(newType);
    }
  }
};

/**
 * Adds subscription filter arguments to `Subscription.{operationName}` based on the supplied `subscriptionRoles`. For example, if
 * `subscriptionRoles` contains an owner rule, this method adds an input definition for the specified owner field. Mutates the relevant
 * output objects of `ctx`.
 */
export const addSubscriptionArguments = (
  ctx: TransformerTransformSchemaStepContextProvider,
  operationName: string,
  subscriptionRoles: Array<RoleDefinition>,
): void => {
  let subscription = ctx.output.getSubscription()!;
  let createField: FieldDefinitionNode = subscription!.fields!.find((field) => field.name.value === operationName) as FieldDefinitionNode;
  const subscriptionArgumentList = subscriptionRoles.map((role) => makeInputValueDefinition(role.entity!, makeNamedType('String')));
  createField = {
    ...createField,
    arguments: [...createField.arguments, ...subscriptionArgumentList],
  };
  subscription = {
    ...subscription,
    fields: subscription!.fields!.map((field) => (field.name.value === operationName ? createField : field)),
  };
  ctx.output.putType(subscription);
};

/**
 * Add specified directives to both the field `{typeName}.{operationName}`, and the result type of that field. Mutates the relevant output
 * objects of `ctx`.
 */
export const addDirectivesToOperation = (
  ctx: TransformerTransformSchemaStepContextProvider,
  typeName: string,
  operationName: string,
  directives: Array<DirectiveNode>,
): void => {
  // add directives to the given operation
  addDirectivesToField(ctx, typeName, operationName, directives);

  // add the directives to the result type of the operation
  const type = ctx.output.getType(typeName) as ObjectTypeDefinitionNode;
  if (type) {
    const field = type.fields!.find((f) => f.name.value === operationName);

    if (field) {
      const returnFieldType = field.type as NamedTypeNode;

      if (returnFieldType.name) {
        const returnTypeName = returnFieldType.name.value;

        extendTypeWithDirectives(ctx, returnTypeName, directives);
      }
    }
  }
};

/**
 * Return all fields of the `Query` type for the specified model
 */
export const getQueryFieldNames = (
  modelDirectiveConfig: ModelDirectiveConfiguration,
): Set<{ fieldName: string; typeName: string; type: QueryFieldType }> => {
  const fields: Set<{ fieldName: string; typeName: string; type: QueryFieldType }> = new Set();
  if (modelDirectiveConfig?.queries?.get) {
    fields.add({
      typeName: 'Query',
      fieldName: modelDirectiveConfig.queries.get,
      type: QueryFieldType.GET,
    });
  }

  if (modelDirectiveConfig?.queries?.list) {
    fields.add({
      typeName: 'Query',
      fieldName: modelDirectiveConfig.queries.list,
      type: QueryFieldType.LIST,
    });
  }

  if (modelDirectiveConfig?.queries?.sync) {
    fields.add({
      typeName: 'Query',
      fieldName: modelDirectiveConfig.queries.sync,
      type: QueryFieldType.SYNC,
    });
  }
  return fields;
};

/**
 * Return all fields of the `Mutation` type for the specified model
 */
export const getMutationFieldNames = (
  modelDirectiveConfig: ModelDirectiveConfiguration,
): Set<{ fieldName: string; typeName: string; type: MutationFieldType }> => {
  // Todo: get fields names from the directives
  const getMutationType = (type: string): MutationFieldType => {
    switch (type) {
      case 'create':
        return MutationFieldType.CREATE;
      case 'update':
        return MutationFieldType.UPDATE;
      case 'delete':
        return MutationFieldType.DELETE;
      default:
        throw new Error('Unknown mutation type');
    }
  };

  const fieldNames: Set<{ fieldName: string; typeName: string; type: MutationFieldType }> = new Set();
  for (const [mutationType, mutationName] of Object.entries(modelDirectiveConfig?.mutations || {})) {
    if (mutationName) {
      fieldNames.add({
        typeName: 'Mutation',
        fieldName: mutationName,
        type: getMutationType(mutationType),
      });
    }
  }

  return fieldNames;
};

/**
 * Return all fields of the `Subscription` type for the specified model
 */
export const getSubscriptionFieldNames = (
  modelDirectiveConfig: ModelDirectiveConfiguration,
): Set<{
  fieldName: string;
  typeName: string;
}> => {
  const fields: Set<{
    fieldName: string;
    typeName: string;
  }> = new Set();

  const subscriptionLevel = modelDirectiveConfig?.subscriptions?.level ?? SubscriptionLevel.on;
  if (subscriptionLevel !== SubscriptionLevel.on) {
    return fields;
  }

  if (modelDirectiveConfig?.subscriptions?.onCreate && modelDirectiveConfig.mutations?.create) {
    for (const fieldName of modelDirectiveConfig.subscriptions.onCreate) {
      fields.add({
        typeName: 'Subscription',
        fieldName,
      });
    }
  }

  if (modelDirectiveConfig?.subscriptions?.onUpdate && modelDirectiveConfig.mutations?.update) {
    for (const fieldName of modelDirectiveConfig.subscriptions.onUpdate) {
      fields.add({
        typeName: 'Subscription',
        fieldName,
      });
    }
  }

  if (modelDirectiveConfig?.subscriptions?.onDelete && modelDirectiveConfig.mutations?.delete) {
    for (const fieldName of modelDirectiveConfig.subscriptions.onDelete) {
      fields.add({
        typeName: 'Subscription',
        fieldName,
      });
    }
  }

  return fields;
};

const ensureValidSubscriptionName = (name: string): string => {
  if (name.length <= 50) return name;

  return name.slice(0, 45) + md5(name).slice(0, 5);
};

const getKeyFields = (ctx: TransformerContextProvider, model: ObjectTypeDefinitionNode): Array<string> => {
  const table = getTable(ctx, model);
  const hashKeyField = table.keySchema.find((f) => f.keyType === 'HASH').attributeName;
  const sortKeyFields = table.keySchema.find((f) => f.keyType === 'RANGE')?.attributeName.split('#');
  const keyFields = [hashKeyField];
  if (sortKeyFields) {
    keyFields.push(...sortKeyFields);
  }
  return keyFields;
};
