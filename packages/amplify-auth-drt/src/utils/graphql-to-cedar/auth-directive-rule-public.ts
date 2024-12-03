import { ObjectTypeDefinitionNode, ValueNode } from 'graphql';
import pluralize from 'pluralize';
import { isEnumValueNode, isListValueNode, isStringValueNode } from '../graphql-utils';
import { CedarPolicy } from './cedar-policy';
import { AuthDirectiveRuleValue } from './auth-directive';
import { CedarEntityUid } from './cedar-entity';

export const getEnumValueFromRuleField = (obj: AuthDirectiveRuleValue, fieldName: string): string | undefined => {
  const field = obj.fields.find((f) => f.name.value === fieldName);
  if (!field) {
    return undefined;
  }

  if (!isEnumValueNode(field.value)) {
    return undefined;
  }

  return field.value.value;
};

export const getListValueFromRuleField = (obj: AuthDirectiveRuleValue, fieldName: string): readonly ValueNode[] | undefined => {
  const field = obj.fields.find((f) => f.name.value === fieldName);
  if (!field) {
    return undefined;
  }

  if (!isListValueNode(field.value)) {
    return undefined;
  }

  return field.value.values;
};

export const getStringValueFromRuleField = (obj: AuthDirectiveRuleValue, fieldName: string): string | undefined => {
  const field = obj.fields.find((f) => f.name.value === fieldName);
  if (!field) {
    return undefined;
  }

  if (!isStringValueNode(field.value)) {
    return undefined;
  }

  return field.value.value;
};

/**
 * Type predicate that is true if the incoming rule matches '{allow: public}'. It does not assert the existence or non-existence of any
 * 'provider'.
 */
export const isAuthDirectiveRulePublic = (obj: AuthDirectiveRuleValue): boolean => {
  return getEnumValueFromRuleField(obj, 'allow') === 'public';
};

/**
 * Type predicate that is true if the incoming rule matches '{allow: public, provider: apiKey}'
 */
export const isAuthDirectiveRulePublicApiKey = (obj: AuthDirectiveRuleValue): boolean => {
  const isPublic = isAuthDirectiveRulePublic(obj);
  const isApiKey = getEnumValueFromRuleField(obj, 'provider') === 'apiKey';
  return isPublic && isApiKey;
};

/**
 * Type predicate that is true if the incoming rule matches '{allow: public, provider: userPools}'
 */
export const isAuthDirectiveRulePublicUserPools = (obj: AuthDirectiveRuleValue): boolean =>
  isAuthDirectiveRulePublic(obj) && getEnumValueFromRuleField(obj, 'provider') === 'userPools';

const getPrincipalTypeForRule = (obj: AuthDirectiveRuleValue): string => {
  if (isAuthDirectiveRulePublicApiKey(obj)) {
    return 'AmplifyApi::AmplifyApiKeyUser';
  } else if (isAuthDirectiveRulePublicUserPools(obj)) {
    return 'AmplifyApi::AmplifyCognitoUserPoolsUser';
  } else if (isAuthDirectiveRulePublic(obj)) {
    // If no provider is specified, we default to public ApiKeyUser
    return 'AmplifyApi::AmplifyApiKeyUser';
  } else {
    throw new Error(`Unsupported rule type: '${JSON.stringify(obj)}'`);
  }
};

/**
 * Creates a policy allowing the appropriate operations for the specified model.
 *
 * Example:
 *
 * ```
 * @ id("permit public to read on Todo")
 * permit (
 *   principal is AmplifyApi::AmplifyApiKeyUser,
 *   action in
 *     [AmplifyApi::Action::"SelectionSetResolve.Todo",
 *      AmplifyApi::Action::"SelectionSetResolve.Todo.id",
 *      AmplifyApi::Action::"SelectionSetResolve.Todo.content",
 *      AmplifyApi::Action::"SelectionSetResolve.Todo.owner",
 *      AmplifyApi::Action::"Query.getTodo",
 *      AmplifyApi::Action::"Query.getTodo.id",
 *      AmplifyApi::Action::"Query.getTodo.content",
 *      AmplifyApi::Action::"Query.getTodo.owner",
 *      AmplifyApi::Action::"Query.listTodo",
 *      AmplifyApi::Action::"Query.listTodo.id",
 *      AmplifyApi::Action::"Query.listTodo.content",
 *      AmplifyApi::Action::"Query.listTodo.owner"],
 *   resource is AmplifyApi::Todo
 * );
 * ```
 */
export const createPolicyFromAuthDirectiveRuleValuePublic = (
  rule: AuthDirectiveRuleValue,
  model: ObjectTypeDefinitionNode,
): CedarPolicy => {
  const modelName = model.name.value;
  const policy: CedarPolicy = {
    effect: 'permit',
    principal: {
      op: 'is',
      entity_type: getPrincipalTypeForRule(rule),
    },
    resource: {
      op: 'is',
      entity_type: `AmplifyApi::${modelName}`,
    },
    action: {
      op: 'in',
      entities: getActionUidsForRule(rule, model),
    },
    conditions: [],
    annotations: {
      id: `permit public to operate on ${modelName}`,
    },
  };
  return policy;
};

export const getActionUidsForRule = (obj: AuthDirectiveRuleValue, model: ObjectTypeDefinitionNode): CedarEntityUid[] => {
  const modelName = model.name.value;
  const pluralizedModelName = pluralize(modelName);
  const fieldNames = model.fields?.map((f) => f.name.value) ?? [];
  const defaultOperations = ['get', 'list', 'create', 'update', 'delete', 'subscribe'];

  // TODO: Support `operations` field of auth rules
  const resolvedOperations = defaultOperations;

  // TODO: Write spec for
  // type Todo @model @auth(rules:[...]) {
  //   # What does a 'list' operation mean on a field?
  //   foo: String @auth(rules: [{allow: <whatever>, operations: [list]}])
  // }
  const actionIds = resolvedOperations.flatMap((op) => {
    switch (op) {
      case 'get':
        return [
          `SelectionSetResolve.${modelName}`,
          ...fieldNames.map((fieldName) => `SelectionSetResolve.${modelName}.${fieldName}`),
          `Query.get${modelName}`,
          ...fieldNames.map((fieldName) => `Query.get${modelName}.${fieldName}`),
        ];
      case 'list':
        return `Query.list${pluralizedModelName}`;
      case 'create':
        return [`Mutation.create${modelName}`, ...fieldNames.map((fieldName) => `Mutation.create${modelName}.${fieldName}`)];
      case 'update':
        return [`Mutation.update${modelName}`, ...fieldNames.map((fieldName) => `Mutation.update${modelName}.${fieldName}`)];
      case 'delete':
        return [`Mutation.delete${modelName}`, ...fieldNames.map((fieldName) => `Mutation.delete${modelName}.${fieldName}`)];
      case 'subscribe':
        return [`Subscription.onCreate${modelName}`, `Subscription.onDelete${modelName}`, `Subscription.onUpdate${modelName}`];
      default:
        throw new Error(`Unsupported operation '${op}'`);
    }
  });

  return actionIds.map((id) => ({ type: 'AmplifyApi::Action', id }));
};
