import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import {
  compoundExpression,
  Expression,
  obj,
  printBlock,
  and,
  equals,
  iff,
  methodCall,
  not,
  ref,
  str,
  bool,
  forEach,
  list,
  qref,
  raw,
  set,
  ifElse,
  nul,
  parens,
  or,
} from 'graphql-mapping-template';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import {
  COGNITO_AUTH_TYPE,
  OIDC_AUTH_TYPE,
  RoleDefinition,
  splitRoles,
  ConfiguredAuthProviders,
  IS_AUTHORIZED_FLAG,
  fieldIsList,
  RelationalPrimaryMapConfig,
  IDENTITY_CLAIM_DELIMITER,
  getPartitionKey,
  getRelationalPrimaryMap,
  ModelOperation,
} from '../../../utils';
import { setHasAuthExpression } from '../../common';
import {
  getIdentityClaimExp,
  getOwnerClaim,
  apiKeyExpression,
  iamExpression,
  lambdaExpression,
  emptyPayload,
  generateOwnerClaimExpression,
  generateOwnerClaimListExpression,
  generateOwnerMultiClaimExpression,
  generateInvalidClaimsCondition,
  generateGroupCheckExpressions,
} from './helpers';
import { InvalidDirectiveError, getKeySchema, getTable } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';

const generateStaticRoleExpression = (roles: Array<RoleDefinition>): Array<Expression> => {
  const staticRoleExpression: Array<Expression> = [];
  const privateRoleIdx = roles.findIndex((r) => r.strategy === 'private');
  if (privateRoleIdx > -1) {
    staticRoleExpression.push(set(ref(IS_AUTHORIZED_FLAG), bool(true)));
    roles.splice(privateRoleIdx, 1);
  }
  if (roles.length > 0) {
    staticRoleExpression.push(
      iff(
        not(ref(IS_AUTHORIZED_FLAG)),
        compoundExpression([
          set(ref('staticGroupRoles'), raw(JSON.stringify(roles.map((r) => ({ claim: r.claim, entity: r.entity }))))),
          forEach(ref('groupRole'), ref('staticGroupRoles'), [
            set(ref('groupsInToken'), getIdentityClaimExp(ref('groupRole.claim'), list([]))),
            iff(
              methodCall(ref('groupsInToken.contains'), ref('groupRole.entity')),
              compoundExpression([set(ref(IS_AUTHORIZED_FLAG), bool(true)), raw('#break')]),
            ),
          ]),
        ]),
      ),
    );
  }
  return staticRoleExpression;
};

const generateAuthOnRelationalModelQueryExpression = (
  roles: Array<RoleDefinition>,
  primaryFieldMap: RelationalPrimaryMapConfig,
): Array<Expression> => {
  const modelQueryExpression = new Array<Expression>();
  const primaryRoles = roles.filter((r) => primaryFieldMap.has(r.entity));
  if (primaryRoles.length > 0) {
    primaryRoles.forEach((role, idx) => {
      const { claim, field } = primaryFieldMap.get(role.entity);
      modelQueryExpression.push(
        generateOwnerClaimExpression(role.claim!, `primaryRole${idx}`),
        iff(
          generateInvalidClaimsCondition(role.claim!, `primaryRole${idx}`),
          compoundExpression([
            generateOwnerMultiClaimExpression(role.claim!, `primaryRole${idx}`),
            generateOwnerClaimListExpression(role.claim!, `ownerClaimsList${idx}`),
            ifElse(
              and([
                parens(not(ref(`util.isNull($ctx.${claim}.${field})`))),
                parens(
                  or([
                    parens(equals(ref(`ctx.${claim}.${field}`), ref(`primaryRole${idx}`))),
                    methodCall(ref(`ownerClaimsList${idx}.contains`), ref(`ctx.${claim}.${field}`)),
                  ]),
                ),
              ]),
              compoundExpression([
                set(ref(IS_AUTHORIZED_FLAG), bool(true)),
                qref(methodCall(ref('ctx.stash.put'), str('authFilter'), nul())),
              ]),
              iff(
                and([not(ref(IS_AUTHORIZED_FLAG)), methodCall(ref('util.isNull'), ref('ctx.stash.authFilter'))]),
                compoundExpression([
                  qref(
                    methodCall(
                      claim === 'source' ? ref(`ctx.stash.connectionAttributes.put`) : ref(`ctx.${claim}.put`),
                      str(field),
                      ref(`primaryRole${idx}`),
                    ),
                  ),
                  set(ref(IS_AUTHORIZED_FLAG), bool(true)),
                ]),
              ),
            ),
          ]),
        ),
      );
    });
    return [iff(not(ref(IS_AUTHORIZED_FLAG)), compoundExpression(modelQueryExpression))];
  }
  return modelQueryExpression;
};

/**
 * In the event that an owner/group field is the same as a primary field we can validate against the args if provided
 * if the field is not in the args we include it in the KeyConditionExpression which is formed as a part of the query
 * when it is formed as a part of the query we can consider the request authorized
 */
const generateAuthOnModelQueryExpression = (
  roles: Array<RoleDefinition>,
  primaryFields: Array<string>,
  isIndexQuery = false,
  primaryKey: string | undefined = undefined,
  sortKeyFields: Array<string>,
): Array<Expression> => {
  const modelQueryExpression: Expression[] = new Array<Expression>();
  const primaryRoles = roles.filter((r) => primaryFields.includes(r.entity));
  if (primaryRoles.length > 0) {
    if (isIndexQuery) {
      primaryRoles.forEach((role, idx) => {
        const claims = role.claim!.split(IDENTITY_CLAIM_DELIMITER);
        const hasMultiClaims = claims.length > 1;
        modelQueryExpression.push(
          generateOwnerClaimExpression(role.claim!, `${role.entity}Claim`),
          iff(
            generateInvalidClaimsCondition(role.claim!, `${role.entity}Claim`),
            compoundExpression([
              generateOwnerMultiClaimExpression(role.claim!, `${role.entity}Claim`),
              generateOwnerClaimListExpression(role.claim!, `ownerClaimsList${idx}`),
              iff(
                methodCall(ref('util.isString'), ref(`${role.entity}Claim`)),
                ifElse(
                  methodCall(ref('util.isList'), methodCall(ref('util.parseJson'), ref(`${role.entity}Claim`))),
                  set(ref(`${role.entity}Claim`), methodCall(ref('util.parseJson'), ref(`${role.entity}Claim`))),
                  set(ref(`${role.entity}Claim`), list([ref(`${role.entity}Claim`)])),
                ),
              ),
              qref(methodCall(ref(`ownerClaimsList${idx}.addAll`), ref(`${role.entity}Claim`))),
              ifElse(
                not(ref(`util.isNull($ctx.args.${role.entity})`)),
                compoundExpression([
                  ifElse(
                    ref(`util.isString($ctx.args.${role.entity})`),
                    set(
                      ref(`${role.entity}Condition`),
                      parens(
                        or([
                          parens(equals(ref(`${role.entity}Claim`), ref(`ctx.args.${role.entity}`))),
                          methodCall(ref(`ownerClaimsList${idx}.contains`), ref(`ctx.args.${role.entity}`)),
                        ]),
                      ),
                    ),
                    compoundExpression([
                      set(
                        ref(`${role.entity}Condition`),
                        parens(
                          or([
                            equals(
                              ref(`${role.entity}Claim`),
                              methodCall(ref('util.defaultIfNull'), raw(`$ctx.args.${role.entity}.get("eq")`), nul()),
                            ),
                            methodCall(
                              ref(`ownerClaimsList${idx}.contains`),
                              methodCall(ref('util.defaultIfNull'), raw(`$ctx.args.${role.entity}.get("eq")`), nul()),
                            ),
                          ]),
                        ),
                      ),
                      iff(
                        not(ref(`${role.entity}Condition`)),
                        compoundExpression([
                          set(ref('entityValues'), raw('0')),
                          forEach(ref(`argEntity`), ref(`ctx.args.${role.entity}.get("eq")`), [
                            iff(
                              methodCall(ref(`ownerClaimsList${idx}.contains`), ref('argEntity')),
                              set(ref('entityValues'), raw('$entityValues + 1')),
                            ),
                          ]),
                          iff(
                            equals(ref('entityValues'), ref(`ctx.args.${role.entity}.get("eq").size()`)),
                            set(ref(`${role.entity}Condition`), bool(true)),
                          ),
                        ]),
                      ),
                    ]),
                  ),
                  iff(
                    ref(`${role.entity}Condition`),
                    compoundExpression([
                      set(ref(IS_AUTHORIZED_FLAG), bool(true)),
                      qref(methodCall(ref('ctx.stash.put'), str('authFilter'), nul())),
                    ]),
                  ),
                ]),
                hasMultiClaims
                  ? qref(methodCall(ref('primaryFieldMap.put'), str(role.entity), ref(`ownerClaimsList${idx}`)))
                  : qref(methodCall(ref('primaryFieldMap.put'), str(role.entity), ref(`${role.entity}Claim`))),
              ),
            ]),
          ),
        );
      });
      modelQueryExpression.push(
        iff(
          and([
            not(ref(IS_AUTHORIZED_FLAG)),
            methodCall(ref('util.isNull'), ref('ctx.stash.authFilter')),
            not(ref('primaryFieldMap.isEmpty()')),
          ]),
          /**
           * The following code block is to handle the cases of dynamic claim field(owner/group)
           * being part of the index sort key field and is missing from the query input arguments.
           * If detected, the last item of the claim list will be added by default to the query condition with "eq".
           * This restricts the records of other users returned from the query in such scenario
           */
          compoundExpression([
            set(ref('sortKeyFields'), list(sortKeyFields.map((sk) => str(sk)))),
            forEach(ref('entry'), ref('primaryFieldMap.entrySet()'), [
              ifElse(
                methodCall(ref('sortKeyFields.contains'), ref('entry.key')),
                compoundExpression([
                  set(ref('entryVal'), ref('entry.value')),
                  set(ref('lastIdx'), ref('entryVal.size() - 1')),
                  set(ref('lastItem'), ref('entryVal.get($lastIdx)')),
                  qref(methodCall(ref('ctx.args.put'), ref('entry.key'), obj({ eq: ref('lastItem') }))),
                ]),
                qref(methodCall(ref('ctx.args.put'), ref('entry.key'), ref('entry.value'))),
              ),
              set(ref(IS_AUTHORIZED_FLAG), bool(true)),
            ]),
          ]),
        ),
      );
    } else {
      primaryRoles.forEach((role, idx) => {
        const claims = role.claim!.split(IDENTITY_CLAIM_DELIMITER);
        const hasMultiClaims = claims.length > 1;
        modelQueryExpression.push(
          generateOwnerClaimExpression(role.claim!, `${role.entity}Claim`),
          iff(
            generateInvalidClaimsCondition(role.claim!, `${role.entity}Claim`),
            compoundExpression([
              generateOwnerMultiClaimExpression(role.claim!, `${role.entity}Claim`),
              generateOwnerClaimListExpression(role.claim!, `ownerClaimsList${idx}`),
              iff(
                methodCall(ref('util.isString'), ref(`${role.entity}Claim`)),
                ifElse(
                  methodCall(ref('util.isList'), methodCall(ref('util.parseJson'), ref(`${role.entity}Claim`))),
                  set(ref(`${role.entity}Claim`), methodCall(ref('util.parseJson'), ref(`${role.entity}Claim`))),
                  set(ref(`${role.entity}Claim`), list([ref(`${role.entity}Claim`)])),
                ),
              ),
              qref(methodCall(ref(`ownerClaimsList${idx}.addAll`), ref(`${role.entity}Claim`))),
              ifElse(
                not(ref(`util.isNull($ctx.args.${role.entity})`)),
                compoundExpression([
                  ifElse(
                    ref(`util.isString($ctx.args.${role.entity})`),
                    set(
                      ref(`${role.entity}Condition`),
                      parens(
                        or([
                          parens(equals(ref(`${role.entity}Claim`), ref(`ctx.args.${role.entity}`))),
                          methodCall(ref(`ownerClaimsList${idx}.contains`), ref(`ctx.args.${role.entity}`)),
                        ]),
                      ),
                    ),
                    // this type is mainly applied on list queries with primaryKeys therefore we can use the get "eq" key
                    // to check if the dynamic role condition is met
                    compoundExpression([
                      set(
                        ref(`${role.entity}Condition`),
                        parens(
                          or([
                            equals(
                              ref(`${role.entity}Claim`),
                              methodCall(ref('util.defaultIfNull'), raw(`$ctx.args.${role.entity}.get("eq")`), nul()),
                            ),
                            methodCall(
                              ref(`ownerClaimsList${idx}.contains`),
                              methodCall(ref('util.defaultIfNull'), raw(`$ctx.args.${role.entity}.get("eq")`), nul()),
                            ),
                          ]),
                        ),
                      ),
                      iff(
                        not(ref(`${role.entity}Condition`)),
                        compoundExpression([
                          set(ref('entityValues'), raw('0')),
                          forEach(ref(`argEntity`), ref(`ctx.args.${role.entity}.get("eq")`), [
                            iff(
                              methodCall(ref(`ownerClaimsList${idx}.contains`), ref('argEntity')),
                              set(ref('entityValues'), raw('$entityValues + 1')),
                            ),
                          ]),
                          iff(
                            equals(ref('entityValues'), ref(`ctx.args.${role.entity}.get("eq").size()`)),
                            set(ref(`${role.entity}Condition`), bool(true)),
                          ),
                        ]),
                      ),
                    ]),
                  ),
                  iff(
                    ref(`${role.entity}Condition`),
                    compoundExpression([
                      set(ref(IS_AUTHORIZED_FLAG), bool(true)),
                      qref(methodCall(ref('ctx.stash.put'), str('authFilter'), nul())),
                    ]),
                  ),
                ]),
                hasMultiClaims
                  ? qref(methodCall(ref('primaryFieldMap.put'), str(role.entity), ref(`ownerClaimsList${idx}`)))
                  : qref(methodCall(ref('primaryFieldMap.put'), str(role.entity), ref(`${role.entity}Claim`))),
              ),
            ]),
          ),
        );
      });
      modelQueryExpression.push(
        // if no args where provided to the listX operation
        // @model will create a scan operation we add these primary fields in the auth filter
        iff(
          and([not(ref(IS_AUTHORIZED_FLAG)), not(ref('primaryFieldMap.isEmpty()'))]),
          ifElse(
            methodCall(ref('util.isNull'), ref(`ctx.args.${primaryKey}`)),
            compoundExpression([
              set(ref('authFilter'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.get("authFilter").get("or")'), list([]))),
              forEach(ref('entry'), ref('primaryFieldMap.entrySet()'), [
                // we are using the filter map so we can test this assignment in mock
                set(ref('filterMap'), obj({})),
                ifElse(
                  methodCall(ref('util.isList'), ref('entry.value')),
                  qref(methodCall(ref('filterMap.put'), ref('entry.key'), raw('{ "in": $entry.value }'))),
                  qref(methodCall(ref('filterMap.put'), ref('entry.key'), raw('{ "eq": $entry.value }'))),
                ),
                qref(methodCall(ref('authFilter.add'), ref('filterMap'))),
              ]),
              qref(methodCall(ref('ctx.stash.put'), str('authFilter'), raw('{ "or": $authFilter }'))),
            ]),
            // if auth filter is null, the partition key is provided in the args, and there is still values in the field map then we are
            // dealing with sort keys we need to append the sort keys to the model query expression
            iff(
              methodCall(ref('util.isNull'), ref('ctx.stash.authFilter')),
              compoundExpression([
                set(ref('modelQueryExpression'), ref('ctx.stash.modelQueryExpression')),
                forEach(ref('entry'), ref('primaryFieldMap.entrySet()'), [
                  set(ref('modelQueryExpression.expression'), str('${modelQueryExpression.expression} AND #${entry.key} = :${entry.key}')),
                  qref(ref('modelQueryExpression.expressionNames.put("#${entry.key}", $entry.key)')),
                  ifElse(
                    methodCall(ref('util.isList'), ref('entry.value')),
                    compoundExpression([
                      set(ref('lastClaim'), raw('$entry.value.size() - 1')),
                      qref(
                        ref(
                          'modelQueryExpression.expressionValues.put(":${entry.key}", $util.dynamodb.toDynamoDB($entry.value[$lastClaim]))',
                        ),
                      ),
                    ]),
                    qref(ref('modelQueryExpression.expressionValues.put(":${entry.key}", $util.dynamodb.toDynamoDB($entry.value))')),
                  ),
                ]),
                qref(methodCall(ref('ctx.stash.put'), str('modelQueryExpression'), ref('modelQueryExpression'))),
                set(ref(IS_AUTHORIZED_FLAG), bool(true)),
              ]),
            ),
          ),
        ),
      );
    }
    return modelQueryExpression;
  }
  return [];
};

const generateAuthFilter = (
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
  operation: ModelOperation,
): Array<Expression> => {
  const authCollectionExp = new Array<Expression>();
  const groupMap = new Map<string, Array<string>>();
  const groupContainsExpression = new Array<Expression>();
  if (!(roles.length > 0)) return [];
  /**
   * if ownerField is a concatenated string (ie. "sub::username")
   * ownerField: { eq: "sub::username"}
   * if ownerField is string
   * ownerField: { eq: "cognito:owner" }
   * if ownerField is a List
   * ownerField: { contains: "cognito:owner"}
   *
   * if groupsField is a string
   * groupsField: { in: "cognito:groups" }
   * if groupsField is a list
   * we create contains expression for each cognito group
   *  */
  roles.forEach((role, idx) => {
    const entityIsList = fieldIsList(fields, role.entity);
    if (role.strategy === 'owner') {
      // AND logic: check if user is in required groups before adding owner filter
      const { groupCheck, groupIff } = generateGroupCheckExpressions(role.operationGroups?.[operation], role.groupClaim, idx);
      const claims = role.claim!.split(IDENTITY_CLAIM_DELIMITER);
      const hasMultiClaims = claims.length > 1;
      const ownerCondition = entityIsList ? 'contains' : 'eq';

      if (hasMultiClaims) {
        authCollectionExp.push(...groupCheck);
        authCollectionExp.push(
          ...[
            generateOwnerClaimExpression(role.claim!, `ownerClaim${idx}`),
            iff(
              generateInvalidClaimsCondition(role.claim!, `ownerClaim${idx}`),
              compoundExpression([
                generateOwnerMultiClaimExpression(role.claim!, `ownerClaim${idx}`),
                groupIff(
                  iff(
                    not(methodCall(ref('util.isNull'), ref(`ownerClaim${idx}`))),
                    qref(methodCall(ref('authFilter.add'), raw(`{"${role.entity}": { "${ownerCondition}": $ownerClaim${idx} }}`))),
                  ),
                ),
              ]),
            ),
          ],
        );

        claims.forEach((claim, secIdx) => {
          authCollectionExp.push(
            ...[
              set(ref(`role${idx}_${secIdx}`), getOwnerClaim(claim)),
              groupIff(
                iff(
                  not(methodCall(ref('util.isNull'), ref(`role${idx}_${secIdx}`))),
                  qref(methodCall(ref('authFilter.add'), raw(`{"${role.entity}": { "${ownerCondition}": $role${idx}_${secIdx} }}`))),
                ),
              ),
            ],
          );
        });
      } else {
        authCollectionExp.push(...groupCheck);
        authCollectionExp.push(
          ...[
            set(ref(`role${idx}`), getOwnerClaim(role.claim!)),
            groupIff(
              iff(
                not(methodCall(ref('util.isNull'), ref(`role${idx}`))),
                qref(methodCall(ref('authFilter.add'), raw(`{"${role.entity}": { "${ownerCondition}": $role${idx} }}`))),
              ),
            ),
          ],
        );
      }
    } else if (role.strategy === 'groups') {
      // for fields where the group is a list and the token is a list we must add every group in the claim
      if (entityIsList) {
        if (groupMap.has(role.claim!)) {
          groupMap.get(role.claim).push(role.entity);
        } else {
          groupMap.set(role.claim!, [role.entity]);
        }
      } else {
        authCollectionExp.push(
          ...[
            set(ref(`role${idx}`), getIdentityClaimExp(str(role.claim!), list([]))),
            iff(
              methodCall(ref('util.isString'), ref(`role${idx}`)),
              ifElse(
                methodCall(ref('util.isList'), methodCall(ref('util.parseJson'), ref(`role${idx}`))),
                set(ref(`role${idx}`), methodCall(ref('util.parseJson'), ref(`role${idx}`))),
                set(ref(`role${idx}`), list([ref(`role${idx}`)])),
              ),
            ),
            iff(
              not(methodCall(ref(`role${idx}.isEmpty`))),
              qref(methodCall(ref('authFilter.add'), raw(`{ "${role.entity}": { "in": $role${idx} } }`))),
            ),
          ],
        );
      }
    }
  });
  groupMap.forEach((fieldList, groupClaim) => {
    groupContainsExpression.push(
      forEach(
        ref('group'),
        ref(`util.defaultIfNull($ctx.identity.claims.get("${groupClaim}"), [])`),
        fieldList.map((field) =>
          iff(not(methodCall(ref('group.isEmpty'))), qref(methodCall(ref('authFilter.add'), raw(`{"${field}": { "contains": $group }}`)))),
        ),
      ),
    );
  });
  return [
    iff(
      not(ref(IS_AUTHORIZED_FLAG)),
      compoundExpression([
        set(ref('authFilter'), list([])),
        ...authCollectionExp,
        ...groupContainsExpression,
        iff(
          not(methodCall(ref('authFilter.isEmpty'))),
          qref(methodCall(ref('ctx.stash.put'), str('authFilter'), raw('{ "or": $authFilter }'))),
        ),
      ]),
    ),
  ];
};

/**
 * Generates the auth filter for the queries
 */
export const generateAuthExpressionForQueries = (
  ctx: TransformerContextProvider,
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
  def: ObjectTypeDefinitionNode,
  indexName: string | undefined = undefined,
  operation: ModelOperation,
): string => {
  const { cognitoStaticRoles, cognitoDynamicRoles, oidcStaticRoles, oidcDynamicRoles, apiKeyRoles, iamRoles, lambdaRoles } =
    splitRoles(roles);
  const isIndexQuery = !!indexName;
  const { keySchema, primaryKey } = getKeySchemaAndPartitionKey(ctx, def, indexName);
  const primaryFields = keySchema.map((att) => att.attributeName);
  const sortKeyFields = keySchema.filter((att) => att.keyType === 'RANGE').map((att) => att.attributeName);
  const getNonPrimaryFieldRoles = (rolesToFilter: RoleDefinition[]): RoleDefinition[] =>
    rolesToFilter.filter((role) => !primaryFields.includes(role.entity));
  const totalAuthExpressions: Array<Expression> = [
    setHasAuthExpression,
    set(ref(IS_AUTHORIZED_FLAG), bool(false)),
    set(ref('primaryFieldMap'), obj({})),
  ];
  if (providers.hasApiKey) {
    totalAuthExpressions.push(apiKeyExpression(apiKeyRoles));
  }
  if (providers.hasLambda) {
    totalAuthExpressions.push(lambdaExpression(lambdaRoles));
  }
  if (providers.hasIAM) {
    totalAuthExpressions.push(
      iamExpression({
        roles: iamRoles,
        adminRolesEnabled: providers.hasAdminRolesEnabled,
        hasIdentityPoolId: providers.hasIdentityPoolId,
        genericIamAccessEnabled: providers.genericIamAccessEnabled,
      }),
    );
  }
  if (providers.hasUserPools) {
    totalAuthExpressions.push(
      iff(
        equals(ref('util.authType()'), str(COGNITO_AUTH_TYPE)),
        compoundExpression([
          ...generateStaticRoleExpression(cognitoStaticRoles),
          ...generateAuthFilter(getNonPrimaryFieldRoles(cognitoDynamicRoles), fields, operation),
          ...generateAuthOnModelQueryExpression(cognitoDynamicRoles, primaryFields, isIndexQuery, primaryKey, sortKeyFields),
        ]),
      ),
    );
  }
  if (providers.hasOIDC) {
    totalAuthExpressions.push(
      iff(
        equals(ref('util.authType()'), str(OIDC_AUTH_TYPE)),
        compoundExpression([
          ...generateStaticRoleExpression(oidcStaticRoles),
          ...generateAuthFilter(getNonPrimaryFieldRoles(oidcDynamicRoles), fields, operation),
          ...generateAuthOnModelQueryExpression(oidcDynamicRoles, primaryFields, isIndexQuery, primaryKey, sortKeyFields),
        ]),
      ),
    );
  }
  totalAuthExpressions.push(
    iff(and([not(ref(IS_AUTHORIZED_FLAG)), methodCall(ref('util.isNull'), ref('ctx.stash.authFilter'))]), ref('util.unauthorized()')),
  );
  return printBlock('Authorization Steps')(compoundExpression([...totalAuthExpressions, emptyPayload]));
};

const getKeySchemaAndPartitionKey = (
  ctx: TransformerContextProvider,
  def: ObjectTypeDefinitionNode,
  indexName: string | undefined = undefined,
): {
  keySchema: any;
  primaryKey: any;
} => {
  let keySchema: any;
  let partitionKey: string;
  const table = getTable(ctx, def);
  try {
    if (indexName) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      keySchema = getKeySchema(table, indexName);
      /* eslint-enable */
    } else {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      keySchema = table.keySchema;
      partitionKey = getPartitionKey(table.keySchema);
      /* eslint-enable */
    }
  } catch (err) {
    throw new InvalidDirectiveError(`Could not fetch keySchema for ${def.name.value}.`);
  }
  return {
    keySchema,
    primaryKey: partitionKey,
  };
};

/**
 * Generates auth filters for relational queries
 */
export const generateAuthExpressionForRelationQuery = (
  ctx: TransformerContextProvider,
  def: ObjectTypeDefinitionNode,
  field: FieldDefinitionNode,
  relatedModelObject: ObjectTypeDefinitionNode,
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
  operation: ModelOperation,
): string => {
  const { cognitoStaticRoles, cognitoDynamicRoles, oidcStaticRoles, oidcDynamicRoles, apiKeyRoles, iamRoles, lambdaRoles } =
    splitRoles(roles);
  const primaryFieldMap = getRelationalPrimaryMap(ctx, def, field, relatedModelObject);
  const getNonPrimaryFieldRoles = (rolesToFilter: RoleDefinition[]): RoleDefinition[] =>
    rolesToFilter.filter((role) => !primaryFieldMap.has(role.entity));
  const totalAuthExpressions: Array<Expression> = [setHasAuthExpression, set(ref(IS_AUTHORIZED_FLAG), bool(false))];
  if (providers.hasApiKey) {
    totalAuthExpressions.push(apiKeyExpression(apiKeyRoles));
  }
  if (providers.hasLambda) {
    totalAuthExpressions.push(lambdaExpression(lambdaRoles));
  }
  if (providers.hasIAM) {
    totalAuthExpressions.push(
      iamExpression({
        roles: iamRoles,
        adminRolesEnabled: providers.hasAdminRolesEnabled,
        hasIdentityPoolId: providers.hasIdentityPoolId,
        genericIamAccessEnabled: providers.genericIamAccessEnabled,
      }),
    );
  }
  if (providers.hasUserPools) {
    totalAuthExpressions.push(
      iff(
        equals(ref('util.authType()'), str(COGNITO_AUTH_TYPE)),
        compoundExpression([
          ...generateStaticRoleExpression(cognitoStaticRoles),
          ...generateAuthFilter(getNonPrimaryFieldRoles(cognitoDynamicRoles), fields, operation),
          ...generateAuthOnRelationalModelQueryExpression(cognitoDynamicRoles, primaryFieldMap),
        ]),
      ),
    );
  }
  if (providers.hasOIDC) {
    totalAuthExpressions.push(
      iff(
        equals(ref('util.authType()'), str(OIDC_AUTH_TYPE)),
        compoundExpression([
          ...generateStaticRoleExpression(oidcStaticRoles),
          ...generateAuthFilter(getNonPrimaryFieldRoles(oidcDynamicRoles), fields, operation),
          ...generateAuthOnRelationalModelQueryExpression(oidcDynamicRoles, primaryFieldMap),
        ]),
      ),
    );
  }
  totalAuthExpressions.push(
    iff(and([not(ref(IS_AUTHORIZED_FLAG)), methodCall(ref('util.isNull'), ref('ctx.stash.authFilter'))]), ref('util.unauthorized()')),
  );
  return printBlock('Authorization Steps')(compoundExpression([...totalAuthExpressions, emptyPayload]));
};
