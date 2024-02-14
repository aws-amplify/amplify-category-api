import {
  DirectiveWrapper,
  TransformerContractError,
  TransformerAuthBase,
  InvalidDirectiveError,
  MappingTemplate,
  TransformerResolver,
  getSortKeyFieldNames,
  generateGetArgumentsInput,
  isSqlModel,
  getModelDataSourceNameForTypeName,
  isModelType,
  getFilterInputName,
  getConditionInputName,
  getSubscriptionFilterInputName,
  getConnectionName,
  InputFieldWrapper,
  isDynamoDbModel,
} from '@aws-amplify/graphql-transformer-core';
import {
  DataSourceProvider,
  MutationFieldType,
  QueryFieldType,
  TransformerTransformSchemaStepContextProvider,
  TransformerContextProvider,
  TransformerResolverProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerAuthProvider,
  TransformerBeforeStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  DirectiveNode,
  FieldDefinitionNode,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  TypeDefinitionNode,
  ListValueNode,
  StringValueNode,
} from 'graphql';
import { merge } from 'lodash';
import {
  SubscriptionLevel,
  ModelDirectiveConfiguration,
  removeSubscriptionFilterInputAttribute,
} from '@aws-amplify/graphql-model-transformer';
import {
  getBaseType,
  makeDirective,
  makeField,
  makeInputValueDefinition,
  makeNamedType,
  ResourceConstants,
  ModelResourceIDs,
  ResolverResourceIDs,
  toUpper,
  isListType,
} from 'graphql-transformer-common';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import {
  getConnectionAttributeName,
  getSortKeyConnectionAttributeName,
  getObjectPrimaryKey,
} from '@aws-amplify/graphql-relational-transformer';
import { AccessControlMatrix } from './accesscontrol';
import {
  AUTH_PROVIDER_DIRECTIVE_MAP,
  DEFAULT_GROUP_CLAIM,
  DEFAULT_IDENTITY_CLAIM,
  IDENTITY_CLAIM_DELIMITER,
  DEFAULT_GROUPS_FIELD,
  DEFAULT_OWNER_FIELD,
  DEFAULT_UNIQUE_IDENTITY_CLAIM,
  MODEL_OPERATIONS,
  SEARCHABLE_AGGREGATE_TYPES,
  AuthRule,
  authDirectiveDefinition,
  ConfiguredAuthProviders,
  getConfiguredAuthProviders,
  collectFieldNames,
  ModelOperation,
  getModelConfig,
  validateFieldRules,
  validateRules,
  AuthProvider,
  extendTypeWithDirectives,
  RoleDefinition,
  addDirectivesToOperation,
  createPolicyDocumentForManagedPolicy,
  getQueryFieldNames,
  getMutationFieldNames,
  addSubscriptionArguments,
  fieldIsList,
  getSubscriptionFieldNames,
  addDirectivesToField,
  getSearchableConfig,
  getScopeForField,
  NONE_DS,
  hasRelationalDirective,
  getAuthDirectiveRules,
  READ_MODEL_OPERATIONS,
} from './utils';
import { defaultIdentityClaimWarning, ownerCanReassignWarning, ownerFieldCaseWarning } from './utils/warnings';
import { DDBAuthVTLGenerator } from './vtl-generator/ddb/ddb-vtl-generator';
import { RDSAuthVTLGenerator } from './vtl-generator/rds/rds-vtl-generator';
import { AuthVTLGenerator } from './vtl-generator/vtl-generator';

/**
 * util to get allowed roles for field
 * if we have a rule like cognito private we can remove all other related roles from the field since it has top level
 * access by the provider.
 */
const getReadRolesForField = (acm: AccessControlMatrix, readRoles: Array<string>, fieldName: string): Array<string> => {
  const hasCognitoPrivateRole =
    readRoles.some((r) => r === 'userPools:private') &&
    acm.isAllowed('userPools:private', fieldName, 'get') &&
    acm.isAllowed('userPools:private', fieldName, 'list') &&
    acm.isAllowed('userPools:private', fieldName, 'sync') &&
    acm.isAllowed('userPools:private', fieldName, 'search') &&
    acm.isAllowed('userPools:private', fieldName, 'listen');
  const hasOIDCPrivateRole =
    readRoles.some((r) => r === 'oidc:private') &&
    acm.isAllowed('oidc:private', fieldName, 'get') &&
    acm.isAllowed('oidc:private', fieldName, 'list') &&
    acm.isAllowed('oidc:private', fieldName, 'sync') &&
    acm.isAllowed('oidc:private', fieldName, 'search') &&
    acm.isAllowed('oidc:private', fieldName, 'listen');
  let allowedRoles = [...readRoles];

  if (hasCognitoPrivateRole) {
    allowedRoles = allowedRoles.filter((r) => !(r.startsWith('userPools:') && r !== 'userPools:private'));
  }
  if (hasOIDCPrivateRole) {
    allowedRoles = allowedRoles.filter((r) => !(r.startsWith('oidc:') && r !== 'oidc:private'));
  }
  return allowedRoles;
};
// @ auth
// changing the schema
//  - transformSchema
// adding resolver
//  - generateResolver
// editing IAM policy
//  - generateResolver (cdk)
// resolver mapping

// resolver.ts for auth pipeline slots

/**
 * The class for running the @auth transformer
 */
export class AuthTransformer extends TransformerAuthBase implements TransformerAuthProvider {
  private configuredAuthProviders: ConfiguredAuthProviders;

  private rules: AuthRule[];

  // access control
  private roleMap: Map<string, RoleDefinition>;

  private authModelConfig: Map<string, AccessControlMatrix>;

  private authNonModelConfig: Map<string, AccessControlMatrix>;

  // model config
  private modelDirectiveConfig: Map<string, ModelDirectiveConfiguration>;

  // schema generation
  private seenNonModelTypes: Map<string, Set<string>>;

  // iam policy generation
  private generateIAMPolicyForUnauthRole: boolean;

  private generateIAMPolicyForAuthRole: boolean;

  private authPolicyResources = new Set<string>();

  private unauthPolicyResources = new Set<string>();

  /**
   * constructor for creating AuthTransformer
   */
  constructor() {
    super('amplify-auth-transformer', authDirectiveDefinition);
    this.modelDirectiveConfig = new Map();
    this.seenNonModelTypes = new Map();
    this.authModelConfig = new Map();
    this.roleMap = new Map();
    this.generateIAMPolicyForUnauthRole = false;
    this.generateIAMPolicyForAuthRole = false;
    this.authNonModelConfig = new Map();
    this.rules = [];
  }

  before = (context: TransformerBeforeStepContextProvider): void => {
    // if there was no auth config in the props we add the authConfig from the context
    this.configuredAuthProviders = getConfiguredAuthProviders(context);
  };

  object = (def: ObjectTypeDefinitionNode, directive: DirectiveNode, context: TransformerSchemaVisitStepContextProvider): void => {
    const modelDirective = def.directives?.find((dir) => dir.name.value === 'model');
    if (!modelDirective) {
      throw new TransformerContractError('Types annotated with @auth must also be annotated with @model.');
    }
    const typeName = def.name.value;
    let isJoinType = false;
    // check if type is a joinedType
    if (context.metadata.has('joinTypeList')) {
      isJoinType = context.metadata.get<Array<string>>('joinTypeList')!.includes(typeName);
    }
    const isSqlDataSource = isModelType(context, typeName) && isSqlModel(context, typeName);
    const getAuthRulesOptions = merge({ isField: false, isSqlDataSource }, generateGetArgumentsInput(context.transformParameters));
    this.rules = getAuthDirectiveRules(new DirectiveWrapper(directive), getAuthRulesOptions);

    // validate rules
    validateRules(this.rules, this.configuredAuthProviders, def.name.value, context);
    // create access control for object
    const acm = new AccessControlMatrix({
      name: def.name.value,
      operations: MODEL_OPERATIONS,
      resources: collectFieldNames(def),
    });
    // Check the rules to see if we should generate Auth/Unauth Policies
    this.setAuthPolicyFlag(this.rules);
    this.setUnauthPolicyFlag(this.rules);
    // add object into policy
    this.addTypeToResourceReferences(def.name.value, this.rules);
    // turn rules into roles and add into acm and roleMap
    this.convertRulesToRoles(acm, this.rules, isJoinType, undefined, undefined, context);
    this.modelDirectiveConfig.set(
      typeName,
      getModelConfig(modelDirective, typeName, context.transformParameters, context.isProjectUsingDataStore()),
    );
    this.authModelConfig.set(typeName, acm);
  };

  after = (context: TransformerContextProvider): void => {
    const claimWarning = defaultIdentityClaimWarning(context, this.rules);
    if (claimWarning) {
      this.warn(claimWarning);
    }
    const reassignWarning = ownerCanReassignWarning(this.authModelConfig);
    if (reassignWarning) {
      this.warn(reassignWarning.message);
    }
  };

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    field: FieldDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): void => {
    if (parent.kind === Kind.INTERFACE_TYPE_DEFINITION) {
      throw new InvalidDirectiveError(
        `The @auth directive cannot be placed on an interface's field. See ${parent.name.value}${field.name.value}`,
      );
    }
    const isParentTypeBuiltinType =
      parent.name.value === context.output.getQueryTypeName() ||
      parent.name.value === context.output.getMutationTypeName() ||
      parent.name.value === context.output.getSubscriptionTypeName();

    if (isParentTypeBuiltinType) {
      console.warn(
        'Be careful when using @auth directives on a field in a root type. @auth directives on field definitions use the source ' +
          'object to perform authorization logic and the source will be an empty object for fields on root types. ' +
          'Static group authorization should perform as expected.',
      );
    }
    // context.api.host.resolver
    // context.resolver -> resolver manager -> dynamodb, relation directives, searchable
    // creates field resolver

    const modelDirective = parent.directives?.find((dir) => dir.name.value === 'model');
    const typeName = parent.name.value;
    const fieldName = field.name.value;
    const isSqlDataSource = isModelType(context, parent.name.value) && isSqlModel(context, parent.name.value);
    const getAuthRulesOptions = merge({ isField: true, isSqlDataSource }, generateGetArgumentsInput(context.transformParameters));
    const rules: AuthRule[] = getAuthDirectiveRules(new DirectiveWrapper(directive), getAuthRulesOptions);
    validateFieldRules(
      new DirectiveWrapper(directive),
      isParentTypeBuiltinType,
      modelDirective !== undefined,
      field.name.value,
      context.transformParameters,
      parent,
      context,
    );
    validateRules(rules, this.configuredAuthProviders, field.name.value, context);

    // regardless if a model directive is used we generate the policy for iam auth
    this.setAuthPolicyFlag(rules);
    this.setUnauthPolicyFlag(rules);
    this.addFieldToResourceReferences(parent.name.value, field.name.value, rules);

    if (modelDirective) {
      // auth on models
      let acm: AccessControlMatrix;
      // check if the parent is already in the model config if not add it
      if (!this.modelDirectiveConfig.has(typeName)) {
        this.modelDirectiveConfig.set(
          typeName,
          getModelConfig(modelDirective, typeName, context.transformParameters, context.isProjectUsingDataStore()),
        );
        acm = new AccessControlMatrix({
          name: parent.name.value,
          operations: MODEL_OPERATIONS,
          resources: collectFieldNames(parent),
        });
      } else {
        acm = this.authModelConfig.get(typeName) as AccessControlMatrix;
        acm.resetAccessForResource(fieldName);
      }
      this.convertRulesToRoles(acm, rules, false, fieldName, undefined, context);
      this.authModelConfig.set(typeName, acm);
    } else {
      // if @auth is used without @model only generate static group rules in the resolver
      // since we only protect the field for non models we store the typeName + fieldName
      // in the authNonModelTypes map
      const staticRules = rules.filter((rule: AuthRule) => rule.allow !== 'owner' && !rule.groupsField);
      const typeFieldName = `${typeName}:${fieldName}`;
      const acm = new AccessControlMatrix({
        name: typeFieldName,
        operations: ['list', 'get', 'search', 'listen', 'sync'],
        resources: [typeFieldName],
      });
      this.convertRulesToRoles(acm, staticRules, false, typeFieldName, ['list', 'get', 'search', 'listen', 'sync']);
      this.authNonModelConfig.set(typeFieldName, acm);
    }
  };

  transformSchema = (context: TransformerTransformSchemaStepContextProvider): void => {
    const searchableAggregateServiceDirectives = new Set<AuthProvider>();
    const getOwnerFields = (acm: AccessControlMatrix): string[] =>
      acm.getRoles().reduce((prev: string[], role: string) => {
        if (this.roleMap.get(role)!.strategy === 'owner') prev.push(this.roleMap.get(role)!.entity!);
        return prev;
      }, []);
    this.removeAuthFieldsFromSubscriptionFilter(context);
    this.authModelConfig.forEach((acm, modelName) => {
      const def = context.output.getObject(modelName)!;
      const modelHasSearchable = def.directives.some((dir) => dir.name.value === 'searchable');
      const ownerFields = getOwnerFields(acm);
      if (isDynamoDbModel(context, modelName)) {
        const filterInput = context.output.getInput(getFilterInputName(modelName));
        if (filterInput) {
          const updatedFilterInput = { ...filterInput, fields: [...filterInput.fields] };
          ownerFields.forEach((ownerField) => {
            if (!filterInput.fields.some((field) => field.name.value === ownerField)) {
              updatedFilterInput.fields.push(makeInputValueDefinition(ownerField, makeNamedType('ModelStringInput')));
            }
          });
          context.output.updateInput(updatedFilterInput);
        }
        const conditionInput = context.output.getInput(getConditionInputName(modelName));
        if (conditionInput) {
          const updatedConditionInput = { ...conditionInput, fields: [...conditionInput.fields] };
          ownerFields.forEach((ownerField) => {
            if (!conditionInput.fields.some((field) => field.name.value === ownerField)) {
              updatedConditionInput.fields.push(makeInputValueDefinition(ownerField, makeNamedType('ModelStringInput')));
            }
          });
          context.output.updateInput(updatedConditionInput);
        }
        const subscriptionFilterInput = context.output.getInput(getSubscriptionFilterInputName(modelName));
        if (subscriptionFilterInput) {
          const updatedSubscriptionFilterInput = { ...subscriptionFilterInput, fields: [...subscriptionFilterInput.fields] };
          ownerFields.forEach((ownerField) => {
            if (!subscriptionFilterInput.fields.some((field) => field.name.value === ownerField)) {
              updatedSubscriptionFilterInput.fields.push(makeInputValueDefinition(ownerField, makeNamedType('ModelStringInput')));
            }
          });
          context.output.updateInput(updatedSubscriptionFilterInput);
        }
      }
      // collect ownerFields and them in the model
      this.addFieldsToObject(context, modelName, ownerFields);
      // Get the directives we need to add to the GraphQL nodes
      const providers = this.getAuthProviders(acm.getRoles());
      const addDefaultIfNeeded = providers.length === 0 ? this.configuredAuthProviders.shouldAddDefaultServiceDirective : false;
      const directives = this.getServiceDirectives(providers, addDefaultIfNeeded);
      if (modelHasSearchable) {
        providers.forEach((p) => searchableAggregateServiceDirectives.add(p));
      }
      if (directives.length > 0) {
        extendTypeWithDirectives(context, modelName, directives);
      }
      this.protectSchemaOperations(context, def, acm);
      this.propagateAuthDirectivesToNestedTypes(context, context.output.getObject(modelName)!, providers);
    });
    this.authNonModelConfig.forEach((acm, typeFieldName) => {
      // protect the non model field
      const [typeName, fieldName] = typeFieldName.split(':');
      const providers = this.getAuthProviders(acm.getRoles());
      const directives = this.getServiceDirectives(providers, false);
      if (directives.length > 0) {
        addDirectivesToField(context, typeName, fieldName, directives);
      }
    });
    // add the service directives to the searchable aggregate types
    if (searchableAggregateServiceDirectives.size > 0) {
      const serviceDirectives = this.getServiceDirectives(Array.from(searchableAggregateServiceDirectives), false);
      SEARCHABLE_AGGREGATE_TYPES.forEach((aggType) => {
        extendTypeWithDirectives(context, aggType, serviceDirectives);
      });
    }
  };

  generateResolvers = (context: TransformerContextProvider): void => {
    // generate iam policies
    this.generateIAMPolicies(context);
    // generate auth resolver code
    this.authModelConfig.forEach((acm, modelName) => {
      const indexKeyName = `${modelName}:indicies`;
      const def = context.output.getObject(modelName)!;
      const modelNameConfig = this.modelDirectiveConfig.get(modelName);
      const searchableDirective = def.directives.find((dir) => dir.name.value === 'searchable');

      const queryFields = getQueryFieldNames(this.modelDirectiveConfig.get(modelName)!);
      queryFields.forEach((query) => {
        switch (query.type) {
          case QueryFieldType.GET:
            this.protectGetResolver(context, def, query.typeName, query.fieldName, acm);
            break;
          case QueryFieldType.LIST:
            this.protectListResolver(context, def, query.typeName, query.fieldName, acm);
            break;
          case QueryFieldType.SYNC:
            this.protectSyncResolver(context, def, query.typeName, query.fieldName, acm);
            break;
          default:
            throw new TransformerContractError('Unknown query field type');
        }
      });
      // protect additional query fields if they exist
      if (context.metadata.has(indexKeyName)) {
        context.metadata.get<Set<string>>(indexKeyName)!.forEach((index) => {
          const [indexName, indexQueryName] = index.split(':');
          this.protectListResolver(context, def, 'Query', indexQueryName, acm, indexName);
        });
      }
      // check if searchable if included in the typeName
      if (searchableDirective) {
        // protect search query
        const config = getSearchableConfig(searchableDirective, modelName, context.transformParameters);
        this.protectSearchResolver(context, def, context.output.getQueryTypeName()!, config.queries.search, acm);
      }
      // get fields specified in the schema
      // if there is a role that does not have read access on the field then we create a field resolver
      // or there is a relational directive on the field then we should protect that as well
      const readRoles = [...new Set(...READ_MODEL_OPERATIONS.map((op) => acm.getRolesPerOperation(op)))];
      const modelFields = def.fields?.filter((f: { name: { value: string } }) => acm.hasResource(f.name.value)) ?? [];
      const errorFields = new Array<string>();
      modelFields.forEach((field: FieldDefinitionNode) => {
        const fieldReadRoles = getReadRolesForField(acm, readRoles, field.name.value);
        const allowedRoles = fieldReadRoles.filter((r) => READ_MODEL_OPERATIONS.some((op) => acm.isAllowed(r, field.name.value, op)));

        const needsFieldResolver = allowedRoles.length < fieldReadRoles.length;
        if (needsFieldResolver && field.type.kind === Kind.NON_NULL_TYPE) {
          errorFields.push(field.name.value);
        }
        if (hasRelationalDirective(field)) {
          this.protectRelationalResolver(context, def, modelName, field, needsFieldResolver ? allowedRoles : null);
        } else if (needsFieldResolver) {
          this.protectFieldResolver(context, def, modelName, field.name.value, allowedRoles);
        }
      });
      const subscriptionLevel = modelNameConfig.subscriptions?.level ?? SubscriptionLevel.on;
      if (errorFields.length > 0 && subscriptionLevel === SubscriptionLevel.on) {
        throw new InvalidDirectiveError(
          "When using field-level authorization rules you need to add rules to all of the model's required fields with at least read permissions. " +
            `Found model "${def.name.value}" with required fields ${JSON.stringify(
              errorFields,
            )} missing field-level authorization rules.\n\n` +
            'For more information visit https://docs.amplify.aws/cli/graphql/authorization-rules/#field-level-authorization-rules',
        );
      }
      const mutationFields = getMutationFieldNames(this.modelDirectiveConfig.get(modelName)!);
      mutationFields.forEach((mutation) => {
        switch (mutation.type) {
          case MutationFieldType.CREATE:
            this.protectCreateResolver(context, def, mutation.typeName, mutation.fieldName, acm);
            break;
          case MutationFieldType.UPDATE:
            this.protectUpdateResolver(context, def, mutation.typeName, mutation.fieldName, acm);
            break;
          case MutationFieldType.DELETE:
            this.protectDeleteResolver(context, def, mutation.typeName, mutation.fieldName, acm);
            break;
          default:
            throw new TransformerContractError('Unknown Mutation field type');
        }
      });

      const subscriptionFieldNames = getSubscriptionFieldNames(this.modelDirectiveConfig.get(modelName)!);
      const subscriptionRoles = acm.getRolesPerOperation('listen').map((role) => this.roleMap.get(role)!);
      subscriptionFieldNames.forEach((subscription) => {
        this.protectSubscriptionResolver(context, subscription.typeName, subscription.fieldName, subscriptionRoles, def);
      });

      if (context.transformParameters.useSubUsernameForDefaultIdentityClaim) {
        const roleDefinitions = acm.getRoles().map((role) => this.roleMap.get(role)!);

        roleDefinitions.forEach((role) => {
          const hasMultiClaims = role.claim?.split(IDENTITY_CLAIM_DELIMITER)?.length > 1;
          const createOwnerFieldResolver = role.strategy === 'owner' && hasMultiClaims;

          if (createOwnerFieldResolver) {
            this.addFieldResolverForDynamicAuth(context, def, modelName, role.entity);
          }
        });
      }
    });

    this.authNonModelConfig.forEach((acm, typeFieldName) => {
      // field resolvers
      const [typeName, fieldName] = typeFieldName.split(':');
      const def = context.output.getObject(typeName);
      this.protectFieldResolver(context, def, typeName, fieldName, acm.getRoles());
    });
  };

  /**
   * Amplify will not include the dynamic auth fields in the generated subscription filter input type.
   * This is because of a limitation of AppSync service. AppSync doesn't allow multiple conditions on the same field in a filter.
   * Amplify automatically applies filter on the dynamic auth fields, so we don't accept filters on these fields from client.
   * @param context TransformerTransformSchemaStepContextProvider
   */
  removeAuthFieldsFromSubscriptionFilter = (context: TransformerTransformSchemaStepContextProvider): void => {
    this.authModelConfig.forEach((acm, modelName) => {
      acm
        .getRoles()
        .map((role) => this.roleMap.get(role))
        .forEach((role) => {
          if (!role.static && (role.provider === 'userPools' || role.provider === 'oidc')) {
            removeSubscriptionFilterInputAttribute(context, modelName, role.entity);
          }
        });
    });
  };

  addFieldResolverForDynamicAuth = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
  ): void => {
    let resolver = ctx.resolvers.getResolver(typeName, fieldName);

    if (resolver) {
      resolver.addToSlot(
        'finish',
        undefined,
        MappingTemplate.s3MappingTemplateFromString(
          this.getVtlGenerator(ctx, def.name.value).generateFieldResolverForOwner(fieldName),
          `${typeName}.${fieldName}.{slotName}.{slotIndex}.res.vtl`,
        ),
      );
    } else {
      const hasModelDirective = def.directives.some((dir) => dir.name.value === 'model');
      const scope = getScopeForField(ctx, def, fieldName, hasModelDirective);

      resolver = ctx.resolvers.addResolver(
        typeName,
        fieldName,
        new TransformerResolver(
          typeName,
          fieldName,
          ResolverResourceIDs.ResolverResourceID(typeName, fieldName),
          MappingTemplate.s3MappingTemplateFromString(
            '$util.toJson({"version":"2018-05-29","payload":{}})',
            `${typeName}.${fieldName}.req.vtl`,
          ),
          MappingTemplate.s3MappingTemplateFromString(
            this.getVtlGenerator(ctx, def.name.value).generateFieldResolverForOwner(fieldName),
            `${typeName}.${fieldName}.res.vtl`,
          ),
          ['init'],
          ['finish'],
        ),
      );

      resolver.setScope(scope);
    }
  };

  protectSchemaOperations = (
    ctx: TransformerTransformSchemaStepContextProvider,
    def: ObjectTypeDefinitionNode,
    acm: AccessControlMatrix,
  ): void => {
    const modelConfig = this.modelDirectiveConfig.get(def.name.value)!;
    const indexKeyName = `${def.name.value}:indicies`;
    const searchableDirective = def.directives.find((dir) => dir.name.value === 'searchable');
    const addServiceDirective = (typeName: string, operation: ModelOperation, operationName: string | null = null): void => {
      if (operationName) {
        const includeDefault = this.doesTypeHaveRulesForOperation(acm, operation);
        const providers = this.getAuthProviders(acm.getRolesPerOperation(operation, operation === 'delete'));
        const operationDirectives = this.getServiceDirectives(providers, includeDefault);
        if (operationDirectives.length > 0) {
          addDirectivesToOperation(ctx, typeName, operationName, operationDirectives);
        }
        this.addOperationToResourceReferences(typeName, operationName, acm.getRoles());
      }
    };
    // default model operations
    addServiceDirective(ctx.output.getQueryTypeName()!, 'get', modelConfig?.queries?.get);
    addServiceDirective(ctx.output.getQueryTypeName()!, 'list', modelConfig?.queries?.list);
    addServiceDirective(ctx.output.getQueryTypeName()!, 'sync', modelConfig?.queries?.sync);
    addServiceDirective(ctx.output.getMutationTypeName()!, 'create', modelConfig?.mutations?.create);
    addServiceDirective(ctx.output.getMutationTypeName()!, 'update', modelConfig?.mutations?.update);
    addServiceDirective(ctx.output.getMutationTypeName()!, 'delete', modelConfig?.mutations?.delete);
    // @index queries
    if (ctx.metadata.has(indexKeyName)) {
      ctx.metadata.get<Set<string>>(indexKeyName)!.forEach((index) => {
        addServiceDirective(ctx.output.getQueryTypeName(), 'list', index.split(':')[1]);
        addServiceDirective(ctx.output.getQueryTypeName(), 'get', index.split(':')[1]);
      });
    }
    // @searchable
    if (searchableDirective) {
      const config = getSearchableConfig(searchableDirective, def.name.value, ctx.transformParameters);
      addServiceDirective(ctx.output.getQueryTypeName(), 'search', config.queries.search);
    }

    const subscriptions = modelConfig?.subscriptions;
    const subscriptionLevel = subscriptions?.level ?? SubscriptionLevel.on;
    if (subscriptionLevel === SubscriptionLevel.on) {
      const subscriptionArguments = acm
        .getRolesPerOperation('listen')
        .map((role) => this.roleMap.get(role)!)
        .filter((roleDef) => roleDef.strategy === 'owner' && !fieldIsList(def.fields ?? [], roleDef.entity!));
      if (subscriptions?.onCreate && modelConfig?.mutations?.create) {
        subscriptions.onCreate.forEach((onCreateSub) => {
          addServiceDirective(ctx.output.getSubscriptionTypeName()!, 'listen', onCreateSub);
          addSubscriptionArguments(ctx, onCreateSub, subscriptionArguments);
        });
      }
      if (subscriptions?.onUpdate && modelConfig?.mutations?.update) {
        subscriptions.onUpdate.forEach((onUpdateSub) => {
          addServiceDirective(ctx.output.getSubscriptionTypeName()!, 'listen', onUpdateSub);
          addSubscriptionArguments(ctx, onUpdateSub, subscriptionArguments);
        });
      }
      if (subscriptions?.onDelete && modelConfig?.mutations?.delete) {
        subscriptions.onDelete.forEach((onDeleteSub) => {
          addServiceDirective(ctx.output.getSubscriptionTypeName()!, 'listen', onDeleteSub);
          addSubscriptionArguments(ctx, onDeleteSub, subscriptionArguments);
        });
      }
    }
  };

  protectGetResolver = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    acm: AccessControlMatrix,
  ): void => {
    const resolver = ctx.resolvers.getResolver(typeName, fieldName) as TransformerResolverProvider;
    const roleDefinitions = acm.getRolesPerOperation('get').map((r) => this.roleMap.get(r)!);
    const authExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthExpressionForQueries(
      ctx,
      this.configuredAuthProviders,
      roleDefinitions,
      def.fields ?? [],
      def,
      undefined,
    );
    resolver.addToSlot(
      'auth',
      MappingTemplate.s3MappingTemplateFromString(authExpression, `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`),
    );
  };

  protectListResolver = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    acm: AccessControlMatrix,
    indexName?: string,
  ): void => {
    const resolver = ctx.resolvers.getResolver(typeName, fieldName) as TransformerResolverProvider;
    const roleDefinitions = acm.getRolesPerOperation('list').map((r) => this.roleMap.get(r)!);
    const authExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthExpressionForQueries(
      ctx,
      this.configuredAuthProviders,
      roleDefinitions,
      def.fields ?? [],
      def,
      indexName,
    );
    resolver.addToSlot(
      'auth',
      MappingTemplate.s3MappingTemplateFromString(authExpression, `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`),
    );
  };

  protectRelationalResolver = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    typeName: string,
    field: FieldDefinitionNode,
    fieldRoles: Array<string> | null,
  ): void => {
    let fieldAuthExpression: string;
    let relatedAuthExpression: string;
    const relatedModelObject = this.getRelatedModelObject(ctx, getBaseType(field.type));
    if (this.authModelConfig.has(relatedModelObject.name.value)) {
      const acm = this.authModelConfig.get(relatedModelObject.name.value);
      const roleDefinitions = [
        ...new Set([
          ...acm.getRolesPerOperation('get'),
          ...acm.getRolesPerOperation('list'),
          ...acm.getRolesPerOperation('sync'),
          ...acm.getRolesPerOperation('search'),
          ...acm.getRolesPerOperation('listen'),
        ]),
      ].map((r) => this.roleMap.get(r)!);
      relatedAuthExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthExpressionForRelationQuery(
        ctx,
        def,
        field,
        relatedModelObject,
        this.configuredAuthProviders,
        roleDefinitions,
        relatedModelObject.fields ?? [],
      );
    } else {
      // if the related @model does not have auth we need to add a sandbox mode expression
      relatedAuthExpression = this.getVtlGenerator(ctx, def.name.value).generateSandboxExpressionForField(
        ctx.transformParameters.sandboxModeEnabled,
      );
    }
    // if there is field auth on the relational query then we need to add field auth read rules first
    // in the request we then add the rules of the related type
    if (fieldRoles) {
      const roleDefinitions = fieldRoles.map((r) => this.roleMap.get(r)!);
      const hasSubsEnabled = this.modelDirectiveConfig.get(typeName)!.subscriptions?.level === 'on';
      relatedAuthExpression = `${this.getVtlGenerator(ctx, def.name.value).setDeniedFieldFlag(
        'Mutation',
        hasSubsEnabled,
      )}\n${relatedAuthExpression}`;
      fieldAuthExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthExpressionForField(
        this.configuredAuthProviders,
        roleDefinitions,
        def.fields ?? [],
        undefined,
      );
    }
    const resolver = ctx.resolvers.getResolver(typeName, field.name.value) as TransformerResolverProvider;
    if (fieldAuthExpression) {
      resolver.addToSlot(
        'auth',
        MappingTemplate.s3MappingTemplateFromString(fieldAuthExpression, `${typeName}.${field.name.value}.{slotName}.{slotIndex}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(
          relatedAuthExpression,
          `${typeName}.${field.name.value}.{slotName}.{slotIndex}.res.vtl`,
        ),
      );
    } else {
      resolver.addToSlot(
        'auth',
        MappingTemplate.s3MappingTemplateFromString(
          relatedAuthExpression,
          `${typeName}.${field.name.value}.{slotName}.{slotIndex}.req.vtl`,
        ),
      );
    }
  };

  protectSyncResolver = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    acm: AccessControlMatrix,
  ): void => {
    if (ctx.isProjectUsingDataStore()) {
      const resolver = ctx.resolvers.getResolver(typeName, fieldName) as TransformerResolverProvider;
      const roleDefinitions = acm.getRolesPerOperation('sync').map((r) => this.roleMap.get(r)!);
      const authExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthExpressionForQueries(
        ctx,
        this.configuredAuthProviders,
        roleDefinitions,
        def.fields ?? [],
        def,
        undefined,
      );
      resolver.addToSlot(
        'auth',
        MappingTemplate.s3MappingTemplateFromString(authExpression, `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`),
      );
    }
  };

  /*
  Searchable Auth
  Protects
    - Search Query
    - Agg Query
  */
  protectSearchResolver = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    acm: AccessControlMatrix,
  ): void => {
    const acmFields = acm.getResources();
    const modelFields = def.fields ?? [];
    // only add readonly fields if they exist
    const allowedAggFields = modelFields.map((f) => f.name.value).filter((f) => !acmFields.includes(f));
    let leastAllowedFields = acmFields;
    const resolver = ctx.resolvers.getResolver(typeName, fieldName) as TransformerResolverProvider;
    // to protect search and aggregation queries we need to collect all the roles which can query
    // and the allowed fields to run field auth on aggregation queries
    const readRoleDefinitions = acm.getRolesPerOperation('search').map((role) => {
      const allowedFields = acmFields.filter((resource) => acm.isAllowed(role, resource, 'search'));
      const roleDefinition = this.roleMap.get(role)!;
      // we add the allowed fields if the role does not have full access
      // or if the rule is a dynamic rule (ex. ownerField, groupField)
      if (allowedFields.length !== acmFields.length || !roleDefinition.static) {
        roleDefinition.allowedFields = allowedFields;
        leastAllowedFields = leastAllowedFields.filter((f) => allowedFields.includes(f));
      } else {
        roleDefinition.allowedFields = null;
      }
      return roleDefinition;
    });
    // add readonly fields with all the fields every role has access to
    allowedAggFields.push(...leastAllowedFields);
    const authExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthExpressionForSearchQueries(
      this.configuredAuthProviders,
      readRoleDefinitions,
      modelFields,
      allowedAggFields,
    );
    resolver.addToSlot(
      'auth',
      MappingTemplate.s3MappingTemplateFromString(authExpression, `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`),
    );
  };

  /*
  Field Resovler can protect the following
  - model fields
  - fields on an operation (query/mutation)
  - protection on predictions/function/no directive
  Order of precendence
  - resolver in api host (ex. @function, @predictions)
  - no resolver -> creates a blank resolver will return the source field
  */
  protectFieldResolver = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    roles: Array<string>,
  ): void => {
    const roleDefinitions = roles.map((r) => this.roleMap.get(r)!);
    const hasModelDirective = def.directives.some((dir) => dir.name.value === 'model');
    const fieldNode = def.fields.find((f) => f.name.value === fieldName);
    const scope = getScopeForField(ctx, def, fieldName, hasModelDirective);
    if (ctx.api.host.hasResolver(typeName, fieldName)) {
      // TODO: move pipeline resolvers created in the api host to the resolver manager
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const fieldResolver = ctx.api.host.getResolver(typeName, fieldName) as any;
      /* eslint-enable */
      const fieldAuthExpression = this.getVtlGenerator(ctx, def.name.value, fieldNode).generateAuthExpressionForField(
        this.configuredAuthProviders,
        roleDefinitions,
        [],
        fieldName,
      );
      if (!ctx.api.host.hasDataSource(NONE_DS)) {
        ctx.api.host.addNoneDataSource(NONE_DS);
      }
      const authFunction = ctx.api.host.addAppSyncFunction(
        `${toUpper(typeName)}${toUpper(fieldName)}AuthFN`,
        MappingTemplate.s3MappingTemplateFromString(fieldAuthExpression, `${typeName}.${fieldName}.auth.req.vtl`),
        MappingTemplate.inlineTemplateFromString('$util.toJson({})'),
        NONE_DS,
        scope,
      );
      (fieldResolver.pipelineConfig.functions as string[]).unshift(authFunction.functionId);
    } else {
      const fieldAuthExpression = this.getVtlGenerator(ctx, def.name.value, fieldNode).generateAuthExpressionForField(
        this.configuredAuthProviders,
        roleDefinitions,
        def.fields ?? [],
        fieldName,
      );
      const subsEnabled = hasModelDirective ? this.modelDirectiveConfig.get(typeName)!.subscriptions?.level === 'on' : false;
      const fieldResponse = this.getVtlGenerator(ctx, def.name.value, fieldNode).generateFieldAuthResponse(
        'Mutation',
        fieldName,
        subsEnabled,
      );
      const existingResolver = ctx.resolvers.hasResolver(typeName, fieldName);
      if (existingResolver) {
        const resolver = ctx.resolvers.getResolver(typeName, fieldName) as TransformerResolverProvider;
        resolver.addToSlot(
          'auth',
          MappingTemplate.s3MappingTemplateFromString(fieldAuthExpression, `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`),
          MappingTemplate.s3MappingTemplateFromString(fieldResponse, `${typeName}.${fieldName}.{slotName}.{slotIndex}.res.vtl`),
        );
        resolver.setScope(scope);
      } else {
        const resolver = ctx.resolvers.addResolver(
          typeName,
          fieldName,
          new TransformerResolver(
            typeName,
            fieldName,
            ResolverResourceIDs.ResolverResourceID(typeName, fieldName),
            MappingTemplate.s3MappingTemplateFromString(fieldAuthExpression, `${typeName}.${fieldName}.req.vtl`),
            MappingTemplate.s3MappingTemplateFromString(fieldResponse, `${typeName}.${fieldName}.res.vtl`),
            ['init'],
            ['finish'],
          ),
        );
        resolver.setScope(scope);
      }
    }
  };

  protectCreateResolver = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    acm: AccessControlMatrix,
  ): void => {
    const resolver = ctx.resolvers.getResolver(typeName, fieldName) as TransformerResolverProvider;
    const fields = acm.getResources();
    const createRoles = acm.getRolesPerOperation('create').map((role) => {
      const roleDefinition = this.roleMap.get(role)!;
      const allowedFields = fields.filter((resource) => acm.isAllowed(role, resource, 'create'));
      roleDefinition.areAllFieldsAllowed = allowedFields.length === fields.length;
      roleDefinition.allowedFields = this.addAutoGeneratedFields(ctx, def, allowedFields, fields);
      return roleDefinition;
    });
    const authExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthExpressionForCreate(
      ctx,
      this.configuredAuthProviders,
      createRoles,
      def.fields ?? [],
    );
    resolver.addToSlot(
      'auth',
      MappingTemplate.s3MappingTemplateFromString(authExpression, `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`),
    );
  };

  protectUpdateResolver = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    acm: AccessControlMatrix,
  ): void => {
    const resolver = ctx.resolvers.getResolver(typeName, fieldName) as TransformerResolverProvider;
    const fields = acm.getResources();
    const updateDeleteRoles = [...new Set([...acm.getRolesPerOperation('update'), ...acm.getRolesPerOperation('delete')])];
    // protect fields to be updated and fields that can't be set to null (partial delete on fields)
    const totalRoles = updateDeleteRoles.map((role) => {
      const allowedFields = fields.filter((resource) => acm.isAllowed(role, resource, 'update'));
      const nullAllowedFields = fields.filter((resource) => acm.isAllowed(role, resource, 'delete'));
      const roleDefinition = this.roleMap.get(role)!;
      roleDefinition.areAllFieldsAllowed = allowedFields.length === fields.length;
      roleDefinition.areAllFieldsNullAllowed = nullAllowedFields.length === fields.length;
      // include primary key in allowed fields on update
      // the primary key won't be updated, but this indicates that including the primary key in the input should not result in unauth err
      roleDefinition.allowedFields = this.addAutoGeneratedFields(ctx, def, [...allowedFields, getObjectPrimaryKey(def).name.value], fields);
      roleDefinition.nullAllowedFields = nullAllowedFields;

      return roleDefinition;
    });

    const dataSourceName = getModelDataSourceNameForTypeName(ctx, def.name.value);
    const dataSource = ctx.api.host.getDataSource(dataSourceName) as DataSourceProvider;
    const requestExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthRequestExpression(ctx, def);
    const authExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthExpressionForUpdate(
      this.configuredAuthProviders,
      totalRoles,
      def.fields ?? [],
    );
    resolver.addToSlot(
      'auth',
      MappingTemplate.s3MappingTemplateFromString(requestExpression, `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`),
      MappingTemplate.s3MappingTemplateFromString(authExpression, `${typeName}.${fieldName}.{slotName}.{slotIndex}.res.vtl`),
      dataSource,
    );
  };

  protectDeleteResolver = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    acm: AccessControlMatrix,
  ): void => {
    const resolver = ctx.resolvers.getResolver(typeName, fieldName) as TransformerResolverProvider;
    const fields = acm.getResources();
    // only roles with full delete on every field can delete
    const deleteRoleNames = acm.getRolesPerOperation('delete', true);
    const deleteRoles = deleteRoleNames.map((role) => {
      const allowedFields = fields.filter((resource) => acm.isAllowed(role, resource, 'delete'));
      const roleDefinition = this.roleMap.get(role)!;
      roleDefinition.allowedFields = allowedFields;
      return roleDefinition;
    });

    const dataSourceName = getModelDataSourceNameForTypeName(ctx, def.name.value);
    const dataSource = ctx.api.host.getDataSource(dataSourceName) as DataSourceProvider;
    const requestExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthRequestExpression(ctx, def);
    const authExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthExpressionForDelete(
      this.configuredAuthProviders,
      deleteRoles,
      def.fields ?? [],
    );
    resolver.addToSlot(
      'auth',
      MappingTemplate.s3MappingTemplateFromString(requestExpression, `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`),
      MappingTemplate.s3MappingTemplateFromString(authExpression, `${typeName}.${fieldName}.{slotName}.{slotIndex}.res.vtl`),
      dataSource,
    );
  };

  protectSubscriptionResolver = (
    ctx: TransformerContextProvider,
    typeName: string,
    fieldName: string,
    subscriptionRoles: Array<RoleDefinition>,
    def: ObjectTypeDefinitionNode,
  ): void => {
    const resolver = ctx.resolvers.getResolver(typeName, fieldName) as TransformerResolverProvider;
    const authExpression = this.getVtlGenerator(ctx, def.name.value).generateAuthExpressionForSubscriptions(
      this.configuredAuthProviders,
      subscriptionRoles,
    );
    resolver.addToSlot(
      'auth',
      MappingTemplate.s3MappingTemplateFromString(authExpression, `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`),
    );
  };

  /*
  Role Helpers
  */
  private convertRulesToRoles(
    acm: AccessControlMatrix,
    authRules: AuthRule[],
    allowRoleOverwrite: boolean,
    field?: string,
    overrideOperations?: ModelOperation[],
    context?: TransformerSchemaVisitStepContextProvider,
  ): void {
    authRules.forEach((rule) => {
      const operations: ModelOperation[] = overrideOperations || rule.operations || MODEL_OPERATIONS;
      if (rule.groups && !rule.groupsField) {
        rule.groups.forEach((group) => {
          const groupClaim = rule.groupClaim || DEFAULT_GROUP_CLAIM;
          const roleName = `${rule.provider}:staticGroup:${group}:${groupClaim}`;
          if (!(roleName in this.roleMap)) {
            this.roleMap.set(roleName, {
              provider: rule.provider!,
              strategy: rule.allow,
              static: true,
              claim: groupClaim,
              entity: group,
            });
          }
          acm.setRole({
            role: roleName,
            resource: field,
            operations,
            allowRoleOverwrite,
          });
        });
      } else {
        let roleName: string;
        let roleDefinition: RoleDefinition;
        switch (rule.provider) {
          case 'apiKey':
            roleName = 'apiKey:public';
            roleDefinition = { provider: rule.provider, strategy: rule.allow, static: true };
            break;
          case 'function':
            roleName = 'function:custom';
            roleDefinition = { provider: rule.provider, strategy: rule.allow, static: true };
            break;
          case 'iam':
            roleName = `iam:${rule.allow}`;
            roleDefinition = {
              provider: rule.provider,
              strategy: rule.allow,
              static: true,
              claim: rule.allow === 'private' ? 'authRole' : 'unauthRole',
            };
            break;
          case 'oidc':
          case 'userPools':
            if (rule.allow === 'groups') {
              const groupClaim = rule.groupClaim || DEFAULT_GROUP_CLAIM;
              const groupsField = rule.groupsField || DEFAULT_GROUPS_FIELD;
              const fieldType = (context.output.getType(acm.getName()) as any).fields.find((f) => f.name.value === groupsField);
              const isGroupFieldList = fieldType ? isListType(fieldType.type) : false;
              roleName = `${rule.provider}:dynamicGroup:${groupsField}:${groupClaim}`;
              roleDefinition = {
                provider: rule.provider,
                strategy: rule.allow,
                static: false,
                claim: groupClaim,
                entity: groupsField,
                isEntityList: isGroupFieldList,
              };
            } else if (rule.allow === 'owner') {
              const ownerField = rule.ownerField || DEFAULT_OWNER_FIELD;
              const fieldType = (context.output.getType(acm.getName()) as any).fields.find((f) => f.name.value === ownerField);
              const isOwnerFieldList = fieldType ? isListType(fieldType.type) : false;
              const useSub = context.transformParameters.useSubUsernameForDefaultIdentityClaim;
              const ownerClaim = rule.identityClaim || (useSub ? DEFAULT_UNIQUE_IDENTITY_CLAIM : DEFAULT_IDENTITY_CLAIM);
              roleName = `${rule.provider}:owner:${ownerField}:${ownerClaim}`;
              roleDefinition = {
                provider: rule.provider,
                strategy: rule.allow,
                static: false,
                claim: ownerClaim,
                entity: ownerField,
                isEntityList: isOwnerFieldList,
              };
            } else if (rule.allow === 'private') {
              roleName = `${rule.provider}:${rule.allow}`;
              roleDefinition = {
                provider: rule.provider,
                strategy: rule.allow,
                static: true,
              };
            } else {
              throw new TransformerContractError(`Could not create a role from ${JSON.stringify(rule)}`);
            }
            break;
          default:
            throw new TransformerContractError(`Could not create a role from ${JSON.stringify(rule)}`);
        }
        if (!(roleName in this.roleMap)) {
          this.roleMap.set(roleName, roleDefinition);
        }
        acm.setRole({
          role: roleName,
          resource: field,
          operations,
          allowRoleOverwrite,
        });
      }
    });
  }

  private doesTypeHaveRulesForOperation(acm: AccessControlMatrix, operation: ModelOperation): boolean {
    const rolesHasDefaultProvider = (roles: Array<string>): boolean =>
      roles.some((r) => this.roleMap.get(r)!.provider! === this.configuredAuthProviders.default);
    const roles = acm.getRolesPerOperation(operation, operation === 'delete');
    return rolesHasDefaultProvider(roles) || (roles.length === 0 && this.configuredAuthProviders.shouldAddDefaultServiceDirective);
  }

  private getAuthProviders(roles: Array<string>): Array<AuthProvider> {
    const providers: Set<AuthProvider> = new Set();
    // get the roles created for type
    roles.forEach((role) => providers.add(this.roleMap.get(role)!.provider));
    if (this.configuredAuthProviders.hasAdminRolesEnabled) {
      providers.add('iam');
    }
    return Array.from(providers);
  }

  /**
   * Helper method to get related model object
   */
  getRelatedModelObject = (ctx: TransformerContextProvider, typeName: string): ObjectTypeDefinitionNode => {
    const modelObjectName: string = ModelResourceIDs.IsModelConnectionType(typeName)
      ? ModelResourceIDs.GetModelFromConnectionType(typeName)
      : typeName;
    if (!ctx.output.hasType(modelObjectName)) {
      throw new TransformerContractError(`Could not find type: ${modelObjectName}`);
    } else {
      return ctx.output.getObject(modelObjectName);
    }
  };

  /**
   * Helper method to add fields to object
   */
  addFieldsToObject = (ctx: TransformerTransformSchemaStepContextProvider, modelName: string, ownerFields: Array<string>): void => {
    const modelObject = ctx.output.getObject(modelName)!;
    const existingFields = collectFieldNames(modelObject);
    const ownerFieldsToAdd = ownerFields.filter((field) => !existingFields.includes(field));
    ownerFieldsToAdd.forEach((ownerField) => {
      const warningField = existingFields.find((field) => field.toLowerCase() === ownerField.toLowerCase());
      if (warningField) {
        this.warn(ownerFieldCaseWarning(ownerField, warningField, modelName));
      }
      (modelObject as any).fields.push(makeField(ownerField, [], makeNamedType('String')));
    });
    ctx.output.putType(modelObject);
  };

  private propagateAuthDirectivesToNestedTypes(
    ctx: TransformerTransformSchemaStepContextProvider,
    def: ObjectTypeDefinitionNode,
    providers: Array<AuthProvider>,
  ): void {
    const nonModelTypePredicate = (fieldType: TypeDefinitionNode): TypeDefinitionNode | undefined => {
      if (fieldType) {
        if (fieldType.kind !== 'ObjectTypeDefinition') {
          return undefined;
        }
        const typeModel = fieldType.directives!.find((dir) => dir.name.value === 'model');
        return typeModel !== undefined ? undefined : fieldType;
      }
      return fieldType;
    };
    const nonModelFieldTypes = def
      .fields!.map((f) => ctx.output.getType(getBaseType(f.type)) as TypeDefinitionNode)
      .filter(nonModelTypePredicate);

    nonModelFieldTypes.forEach((nonModelFieldType) => {
      const nonModelName = nonModelFieldType.name.value;
      const hasSeenType = this.seenNonModelTypes.has(nonModelFieldType.name.value);
      let directives = this.getServiceDirectives(providers, hasSeenType);
      if (!hasSeenType) {
        this.seenNonModelTypes.set(nonModelName, new Set<string>([...directives.map((dir) => dir.name.value)]));
        // since we haven't seen this type before we add it to the iam policy resource sets
        const hasIAM = directives.some((dir) => dir.name.value === 'aws_iam') || this.configuredAuthProviders.default === 'iam';
        if (hasIAM) {
          this.unauthPolicyResources.add(`${nonModelFieldType.name.value}/null`);
          this.authPolicyResources.add(`${nonModelFieldType.name.value}/null`);
        }
      } else {
        const currentDirectives = this.seenNonModelTypes.get(nonModelName)!;
        directives = directives.filter((dir) => !currentDirectives.has(dir.name.value));
        this.seenNonModelTypes.set(nonModelName, new Set<string>([...directives.map((dir) => dir.name.value), ...currentDirectives]));
      }
      // we continue to check the nested types if we find that directives list is not empty or if haven't seen the type before
      if (directives.length > 0 || !hasSeenType) {
        extendTypeWithDirectives(ctx, nonModelFieldType.name.value, directives);
        this.propagateAuthDirectivesToNestedTypes(ctx, <ObjectTypeDefinitionNode>nonModelFieldType, providers);
      }
    });
  }

  private getServiceDirectives(providers: Readonly<Array<AuthProvider>>, addDefaultIfNeeded = true): Array<DirectiveNode> {
    if (providers.length === 0) {
      return [];
    }
    const directives: Array<DirectiveNode> = [];
    /*
      We only add a service directive if it's not the default or
      it's the default but there are other rules under different providers.
      For fields we don't we don't add the default since it would open up access.
    */
    const addDirectiveIfNeeded = (provider: AuthProvider, directiveName: string): void => {
      if (
        (this.configuredAuthProviders.default !== provider && providers.some((p) => p === provider)) ||
        (this.configuredAuthProviders.default === provider && providers.some((p) => p !== provider && addDefaultIfNeeded === true))
      ) {
        directives.push(makeDirective(directiveName, []));
      }
    };

    AUTH_PROVIDER_DIRECTIVE_MAP.forEach((directiveName, authProvider) => {
      addDirectiveIfNeeded(authProvider, directiveName);
    });
    /*
      If we have any rules for the default provider AND those with other providers,
      we add the default provider directive, regardless of the addDefaultDirective value

      For example if we have this rule and the default is API_KEY
      @auth(rules: [{ allow: owner }, { allow: public, operations: [read] }])

      Then we need to add @aws_api_key on the queries along with @aws_cognito_user_pools, but we
      cannot add @aws_api_key to other operations since their is no rule granted access to it
    */
    if (
      providers.some((p) => p === this.configuredAuthProviders.default) &&
      providers.some((p) => p !== this.configuredAuthProviders.default) &&
      !directives.some((d) => d.name.value === AUTH_PROVIDER_DIRECTIVE_MAP.get(this.configuredAuthProviders.default))
    ) {
      directives.push(makeDirective(AUTH_PROVIDER_DIRECTIVE_MAP.get(this.configuredAuthProviders.default) as string, []));
    }
    return directives;
  }

  /*
  IAM Helpers
   */
  private generateIAMPolicies(ctx: TransformerContextProvider): void {
    // iam
    if (this.generateIAMPolicyForAuthRole) {
      // Sanity check to make sure we're not generating invalid policies, where no resources are defined.
      if (this.authPolicyResources.size === 0) {
        // When AdminUI is enabled, IAM auth is added but it does not need any policies to be generated
        if (!this.configuredAuthProviders.hasAdminRolesEnabled) {
          throw new TransformerContractError('AuthRole policies should be generated, but no resources were added.');
        }
      } else {
        const authRole = ctx.synthParameters.authenticatedUserRoleName;
        const authPolicyDocuments = createPolicyDocumentForManagedPolicy(ctx, this.authPolicyResources);
        const { scope } = ctx.stackManager;
        // we need to add the arn path as this is something cdk is looking for when using imported roles in policies
        const iamAuthRoleArn = iam.Role.fromRoleArn(
          scope,
          'auth-role-name',
          `arn:aws:iam::${cdk.Stack.of(scope).account}:role/${authRole}`,
        );
        authPolicyDocuments.forEach((authPolicyDocument, i) => {
          const paddedIndex = `${i + 1}`.padStart(2, '0');
          const resourceName = `${ResourceConstants.RESOURCES.AuthRolePolicy}${paddedIndex}`;
          new iam.ManagedPolicy(scope, resourceName, {
            document: iam.PolicyDocument.fromJson(authPolicyDocument),
            roles: [iamAuthRoleArn],
          });
        });
      }
    }
    if (this.generateIAMPolicyForUnauthRole) {
      // Sanity check to make sure we're not generating invalid policies, where no resources are defined.
      if (this.unauthPolicyResources.size === 0) {
        throw new TransformerContractError('UnauthRole policies should be generated, but no resources were added');
      }
      const unauthRole = ctx.synthParameters.unauthenticatedUserRoleName;
      const unauthPolicyDocuments = createPolicyDocumentForManagedPolicy(ctx, this.unauthPolicyResources);
      const { scope } = ctx.stackManager;
      const iamUnauthRoleArn = iam.Role.fromRoleArn(
        scope,
        'unauth-role-name',
        `arn:aws:iam::${cdk.Stack.of(scope).account}:role/${unauthRole}`,
      );
      unauthPolicyDocuments.forEach((unauthPolicyDocument, i) => {
        const paddedIndex = `${i + 1}`.padStart(2, '0');
        const resourceName = `${ResourceConstants.RESOURCES.UnauthRolePolicy}${paddedIndex}`;
        new iam.ManagedPolicy(ctx.stackManager.scope, resourceName, {
          document: iam.PolicyDocument.fromJson(unauthPolicyDocument),
          roles: [iamUnauthRoleArn],
        });
      });
    }
  }

  private setAuthPolicyFlag(rules: AuthRule[]): void {
    if (rules.length === 0 || this.generateIAMPolicyForAuthRole === true) {
      return;
    }
    this.generateIAMPolicyForAuthRole = rules.some(
      (rule) => (rule.allow === 'private' || rule.allow === 'public') && rule.provider === 'iam',
    );
  }

  private setUnauthPolicyFlag(rules: AuthRule[]): void {
    if (rules.length === 0 || this.generateIAMPolicyForUnauthRole === true) {
      return;
    }
    this.generateIAMPolicyForUnauthRole = rules.some((rule) => rule.allow === 'public' && rule.provider === 'iam');
  }

  private addOperationToResourceReferences(operationName: string, fieldName: string, roles: Array<string>): void {
    const iamPublicRolesExist = roles.some((r) => this.roleMap.get(r)!.provider === 'iam' && this.roleMap.get(r)!.strategy === 'public');
    const iamPrivateRolesExist = roles.some((r) => this.roleMap.get(r)!.provider === 'iam' && this.roleMap.get(r)!.strategy === 'private');

    if (iamPublicRolesExist) {
      this.unauthPolicyResources.add(`${operationName}/${fieldName}`);
      this.authPolicyResources.add(`${operationName}/${fieldName}`);
    }
    if (iamPrivateRolesExist) {
      this.authPolicyResources.add(`${operationName}/${fieldName}`);
    }
  }

  /**
   * TODO: Change Resource Ref Object/Field Functions to work with roles
   */
  private addTypeToResourceReferences(typeName: string, rules: AuthRule[]): void {
    const iamPublicRulesExist = rules.some((r) => r.allow === 'public' && r.provider === 'iam' && r.generateIAMPolicy);
    const iamPrivateRulesExist = rules.some((r) => r.allow === 'private' && r.provider === 'iam' && r.generateIAMPolicy);

    if (iamPublicRulesExist) {
      this.unauthPolicyResources.add(`${typeName}/null`);
      this.authPolicyResources.add(`${typeName}/null`);
    }
    if (iamPrivateRulesExist) {
      this.authPolicyResources.add(`${typeName}/null`);
    }
  }

  private addFieldToResourceReferences(typeName: string, fieldName: string, rules: AuthRule[]): void {
    const iamPublicRulesExist = rules.some((r) => r.allow === 'public' && r.provider === 'iam' && r.generateIAMPolicy);
    const iamPrivateRulesExist = rules.some((r) => r.allow === 'private' && r.provider === 'iam' && r.generateIAMPolicy);

    if (iamPublicRulesExist) {
      this.unauthPolicyResources.add(`${typeName}/${fieldName}`);
      this.authPolicyResources.add(`${typeName}/${fieldName}`);
    }
    if (iamPrivateRulesExist) {
      this.authPolicyResources.add(`${typeName}/${fieldName}`);
    }
  }

  /*
  Resolver Helpers
  */
  addAutoGeneratedFields = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    allowedFields: string[],
    fields: readonly string[],
  ): string[] => {
    const allowedFieldsSet = new Set(allowedFields);

    this.addAutoGeneratedRelationalFields(ctx, def, allowedFieldsSet, fields);
    this.addAutoGeneratedIndexFields(def, allowedFieldsSet);
    this.addAutoGeneratedDataStoreFields(ctx, allowedFieldsSet);

    return Array.from(allowedFieldsSet);
  };

  addAutoGeneratedRelationalFields = (
    ctx: TransformerContextProvider,
    def: ObjectTypeDefinitionNode,
    allowedFields: Set<string>,
    fields: readonly string[],
  ): void => {
    const typeDefinitions = ctx.inputDocument.definitions.filter((it) => it.kind === 'ObjectTypeDefinition') as ObjectTypeDefinitionNode[];

    this.addAutoGeneratedHasManyFields(ctx, typeDefinitions, def, allowedFields);
    this.addAutoGeneratedHasOneFields(ctx, typeDefinitions, fields, def, allowedFields);
  };

  addAutoGeneratedIndexFields = (definition: ObjectTypeDefinitionNode, allowedFields: Set<string>): void => {
    const sortKeyFieldValues: ListValueNode[] = definition.fields
      ?.map((it) => it.directives)
      .flat()
      .filter((it) => it.name.value === 'primaryKey' || it.name.value === 'index')
      .map((it) => it.arguments)
      .flat()
      .filter((it) => it.name.value === 'sortKeyFields' && it.value.kind === 'ListValue' && it.value.values.length > 1)
      .map((it) => it.value)
      .flat() as ListValueNode[];

    sortKeyFieldValues.forEach((sortKeyFieldValue) => {
      const accessOnAllKeys = !sortKeyFieldValue.values.some((it) => it.kind !== 'StringValue' || !allowedFields.has(it.value));
      if (accessOnAllKeys) {
        const keyName = sortKeyFieldValue.values
          .map((it) => (it as StringValueNode).value)
          .join(ModelResourceIDs.ModelCompositeKeySeparator());
        allowedFields.add(keyName);
      }
    });
  };

  addAutoGeneratedHasManyFields = (
    ctx: TransformerContextProvider,
    typeDefinitions: ObjectTypeDefinitionNode[],
    def: ObjectTypeDefinitionNode,
    allowedFields: Set<string>,
  ): void => {
    const hasManyRelatedFields = typeDefinitions
      .map((it) => it.fields.map((field) => ({ ...field, relatedType: it })))
      .flat()
      .filter((it) => getBaseType(it.type) === def.name.value && it.directives?.some((d) => d.name.value === 'hasMany'));

    hasManyRelatedFields.forEach((relatedField) => {
      allowedFields.add(
        getConnectionAttributeName(
          ctx.transformParameters,
          relatedField.relatedType.name.value,
          relatedField.name.value,
          getObjectPrimaryKey(relatedField.relatedType).name.value,
        ),
      );
      getSortKeyFieldNames(relatedField.relatedType).forEach((sortKeyFieldName) => {
        allowedFields.add(
          getSortKeyConnectionAttributeName(relatedField.relatedType.name.value, relatedField.name.value, sortKeyFieldName),
        );
      });
    });
  };

  /**
   * Helper to add auto generated @hasOne fields
   */
  addAutoGeneratedHasOneFields = (
    ctx: TransformerContextProvider,
    typeDefinitions: ObjectTypeDefinitionNode[],
    fields: readonly string[],
    def: ObjectTypeDefinitionNode,
    allowedFields: Set<string>,
  ): void => {
    fields.forEach((field) => {
      const modelField = def.fields.find((it) => it.name.value === field);

      const directives = modelField.directives?.filter(
        (dir) =>
          !dir.arguments?.some((it) => it.name.value === 'fields') && (dir.name.value === 'hasOne' || dir.name.value === 'belongsTo'),
      );
      directives.forEach((directive) => {
        const relatedType = typeDefinitions.find((it) => it.name.value === getBaseType(modelField.type));
        if (
          directive.name.value === 'hasOne' ||
          (directive.name.value === 'belongsTo' &&
            relatedType.fields.some((f) => getBaseType(f.type) === def.name.value && f.directives?.some((d) => d.name.value === 'hasOne')))
        ) {
          if (!isSqlModel(ctx, def.name.value)) {
            allowedFields.add(
              getConnectionAttributeName(ctx.transformParameters, def.name.value, field, getObjectPrimaryKey(relatedType).name.value),
            );
          }
          getSortKeyFieldNames(def).forEach((sortKeyFieldName) => {
            allowedFields.add(getSortKeyConnectionAttributeName(def.name.value, field, sortKeyFieldName));
          });
        }
      });
    });
  };

  addAutoGeneratedDataStoreFields = (ctx: TransformerContextProvider, allowedFields: Set<string>): void => {
    const dataStoreFields = ctx.isProjectUsingDataStore() ? ['_version', '_deleted', '_lastChangedAt'] : [];
    dataStoreFields.forEach((item) => allowedFields.add(item));
  };

  getVtlGenerator = (ctx: TransformerContextProvider, typename: string, field?: FieldDefinitionNode): AuthVTLGenerator => {
    // If the field contains SQL directive, treat it as RDS operation.
    if (field && field.directives.some((dir) => dir.name.value === 'sql')) {
      return new RDSAuthVTLGenerator();
    }

    // Check based on schema file
    if (isModelType(ctx, typename) && isSqlModel(ctx, typename)) {
      return new RDSAuthVTLGenerator();
    }
    return new DDBAuthVTLGenerator();
  };
}
