import {
  and,
  bool,
  compoundExpression,
  equals,
  Expression,
  forEach,
  ifElse,
  iff,
  list,
  methodCall,
  not,
  notEquals,
  nul,
  obj,
  or,
  parens,
  printBlock,
  qref,
  raw,
  ref,
  set,
  str,
  toJson,
} from 'graphql-mapping-template';
import {
  ALLOWED_FIELDS,
  API_KEY_AUTH_TYPE,
  DEFAULT_COGNITO_IDENTITY_CLAIM,
  IAM_AUTH_TYPE,
  IDENTITY_CLAIM_DELIMITER,
  IS_AUTHORIZED_FLAG,
  LAMBDA_AUTH_TYPE,
  RoleDefinition,
} from '../../../utils';
import { isNonCognitoIAMPrincipal, setHasAuthExpression } from '../../common';

// since the keySet returns a set we can convert it to a list by converting to json and parsing back as a list
/**
 * Creates get input fields helper
 */
export const getInputFields = (): Expression =>
  set(ref('inputFields'), methodCall(ref('util.parseJson'), methodCall(ref('util.toJson'), ref('ctx.args.input.keySet()'))));

/**
 * Creates get identity claim helper
 */
export const getIdentityClaimExp = (value: Expression, defaultValueExp: Expression): Expression =>
  methodCall(ref('util.defaultIfNull'), methodCall(ref('ctx.identity.claims.get'), value), defaultValueExp);

/**
 * Creates iam check helper
 */
export const iamCheck = (claim: string, exp: Expression, hasIdentityPoolId: boolean): Expression => {
  let iamExp: Expression = equals(ref('ctx.identity.userArn'), ref(`ctx.stash.${claim}`));
  // only include the additional check if we have a private rule and a provided identityPoolId
  if (hasIdentityPoolId && claim === 'authRole') {
    iamExp = or([
      parens(iamExp),
      parens(
        and([
          equals(ref('ctx.identity.cognitoIdentityPoolId'), ref('ctx.stash.identityPoolId')),
          equals(ref('ctx.identity.cognitoIdentityAuthType'), str('authenticated')),
        ]),
      ),
    ]);
  }
  return iff(iamExp, exp);
};

/**
 * Behavior of auth v1
 * Order of how the owner value is retrieved from the jwt
 * if claim is username
 * 1. username
 * 2. cognito:username
 * 3. none value
 *
 * if claim is custom
 * 1. custom
 * 2. none value
 */
export const getOwnerClaim = (ownerClaim: string): Expression => {
  if (ownerClaim === 'username') {
    return getIdentityClaimExp(str(ownerClaim), getIdentityClaimExp(str(DEFAULT_COGNITO_IDENTITY_CLAIM), nul()));
  }
  return getIdentityClaimExp(str(ownerClaim), nul());
};

/**
 * Creates response check for errors helper
 */
export const responseCheckForErrors = (): Expression =>
  iff(ref('ctx.error'), methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type')));

// Common Expressions

/**
 * Creates generate static role expression helper
 */
export const generateStaticRoleExpression = (roles: Array<RoleDefinition>): Array<Expression> => {
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

/**
 * Creates api key expression helper
 */
export const apiKeyExpression = (roles: Array<RoleDefinition>): Expression =>
  iff(
    equals(ref('util.authType()'), str(API_KEY_AUTH_TYPE)),
    compoundExpression([...(roles.length > 0 ? [set(ref(IS_AUTHORIZED_FLAG), bool(true))] : [])]),
  );

/**
 * Creates lambda expression helper
 */
export const lambdaExpression = (roles: Array<RoleDefinition>): Expression =>
  iff(
    equals(ref('util.authType()'), str(LAMBDA_AUTH_TYPE)),
    compoundExpression([...(roles.length > 0 ? [set(ref(IS_AUTHORIZED_FLAG), bool(true))] : [])]),
  );

export type IamExpressionOptions = {
  roles: Array<RoleDefinition>;
  adminRolesEnabled: boolean;
  hasIdentityPoolId: boolean;
  genericIamAccessEnabled: boolean;
  fieldName?: string;
};

/**
 * Creates iam expression helper
 */
export const iamExpression = (options: IamExpressionOptions): Expression => {
  const expression = new Array<Expression>();
  // allow if using an admin role
  if (options.adminRolesEnabled) {
    expression.push(iamAdminRoleCheckExpression(options.fieldName));
  }
  if (options.roles.length > 0) {
    options.roles.forEach((role) => {
      expression.push(
        iff(not(ref(IS_AUTHORIZED_FLAG)), iamCheck(role.claim!, set(ref(IS_AUTHORIZED_FLAG), bool(true)), options.hasIdentityPoolId)),
      );
    });
  } else {
    expression.push(ref('util.unauthorized()'));
  }
  return iff(
    equals(ref('util.authType()'), str(IAM_AUTH_TYPE)),
    generateIAMAccessCheck(options.genericIamAccessEnabled, compoundExpression(expression)),
  );
};

/**
 * Creates an expression that allows generic IAM access for principals not associated to CognitoIdentityPool.
 */
export const generateIAMAccessCheck = (enableIamAccess: boolean, expression: Expression): Expression => {
  if (!enableIamAccess) {
    // No-op if generic IAM access is not enabled.
    return expression;
  }
  return ifElse(isNonCognitoIAMPrincipal, compoundExpression([setHasAuthExpression, set(ref(IS_AUTHORIZED_FLAG), bool(true))]), expression);
};

/**
 * Creates iam admin role check helper
 */
export const iamAdminRoleCheckExpression = (fieldName?: string, adminCheckExpression?: Expression): Expression => {
  const returnStatement = fieldName ? raw(`#return($context.source.${fieldName})`) : raw('#return($util.toJson({}))');
  const fullReturnExpression = adminCheckExpression ? compoundExpression([adminCheckExpression, returnStatement]) : returnStatement;
  return compoundExpression([
    forEach(/* for */ ref('adminRole'), /* in */ ref('ctx.stash.adminRoles'), [
      iff(
        and([
          methodCall(ref('ctx.identity.userArn.contains'), ref('adminRole')),
          notEquals(ref('ctx.identity.userArn'), ref('ctx.stash.authRole')),
          notEquals(ref('ctx.identity.userArn'), ref('ctx.stash.unauthRole')),
        ]),
        fullReturnExpression,
      ),
    ]),
  ]);
};

/**
 * Creates generate auth request helper
 * Get Request for Update and Delete
 */
export const generateAuthRequestExpression = (): string => {
  const statements = [
    set(ref('GetRequest'), obj({ version: str('2018-05-29'), operation: str('GetItem') })),
    ifElse(
      ref('ctx.stash.metadata.modelObjectKey'),
      set(ref('key'), ref('ctx.stash.metadata.modelObjectKey')),
      compoundExpression([set(ref('key'), obj({ id: methodCall(ref('util.dynamodb.toDynamoDB'), ref('ctx.args.input.id')) }))]),
    ),
    qref(methodCall(ref('GetRequest.put'), str('key'), ref('key'))),
    toJson(ref('GetRequest')),
  ];
  return printBlock('Get Request template')(compoundExpression(statements));
};

export const emptyPayload = toJson(raw(JSON.stringify({ version: '2018-05-29', payload: {} })));

/**
 * Generates a list of claims to be iterated over for authorization
 */
export const generateOwnerClaimListExpression = (claim: string, refName: string): Expression => {
  const claims = claim.split(IDENTITY_CLAIM_DELIMITER);

  if (claims.length <= 1) {
    return set(ref(refName), list([]));
  }

  return compoundExpression([
    set(ref(refName), list([])),
    compoundExpression(claims.map((c) => qref(methodCall(ref(`${refName}.add`), getOwnerClaim(c))))),
  ]);
};

/**
 * Creates generate owner claim expression owner
 */
export const generateOwnerClaimExpression = (ownerClaim: string, refName: string): Expression => {
  const expressions: Expression[] = [];
  const identityClaims = ownerClaim.split(IDENTITY_CLAIM_DELIMITER);
  const hasMultiIdentityClaims = identityClaims.length > 1;

  if (hasMultiIdentityClaims) {
    identityClaims.forEach((claim, idx) => {
      expressions.push();
      if (idx === 0) {
        expressions.push(set(ref(refName), getOwnerClaim(claim)));
      } else {
        expressions.push(set(ref(`currentClaim${idx}`), getOwnerClaim(claim)));
      }
    });
  } else {
    expressions.push(set(ref(refName), getOwnerClaim(ownerClaim)));
  }

  return compoundExpression(expressions);
};

/**
 * Concatenates multiple owner claims if any
 */
export const generateOwnerMultiClaimExpression = (ownerClaim: string, refName: string): Expression | undefined => {
  const identityClaims = ownerClaim.split(IDENTITY_CLAIM_DELIMITER);
  const hasMultiIdentityClaims = identityClaims.length > 1;

  if (hasMultiIdentityClaims) {
    const additionalClaims = [...Array(identityClaims.length).keys()].splice(1).map((idx) => `$currentClaim${idx}`);
    return set(ref(refName), raw(`"$${[refName, ...additionalClaims].join(IDENTITY_CLAIM_DELIMITER)}"`));
  }
};

/**
 * Generates a check for invalid owner claims
 */
export const generateInvalidClaimsCondition = (ownerClaim: string, refName: string): Expression => {
  const identityClaims = ownerClaim.split(IDENTITY_CLAIM_DELIMITER);
  const hasMultiIdentityClaims = identityClaims.length > 1;

  const ownerClaimCheck = not(methodCall(ref('util.isNull'), ref(refName)));
  if (!hasMultiIdentityClaims) {
    return ownerClaimCheck;
  }

  const additionalClaimsChecks = [...Array(identityClaims.length).keys()]
    .splice(1)
    .map((idx) => not(methodCall(ref('util.isNull'), ref(`currentClaim${idx}`))));
  return and([ownerClaimCheck, ...additionalClaimsChecks]);
};

/**
 * Sets the value of owner field if the user is already Authorized
 */
export const generatePopulateOwnerField = (
  claimRef: string,
  ownerEntity: string,
  entityRef: string,
  entityIsList: boolean,
  checkIfAuthorized: boolean,
  allowedFieldsKey?: string,
  allowedFieldsCondition?: string,
): Expression => {
  const conditionsToCheck = new Array<Expression>();
  if (checkIfAuthorized) {
    conditionsToCheck.push(ref(IS_AUTHORIZED_FLAG));
  }
  conditionsToCheck.push(ref('util.isNull($' + `${entityRef})`));
  conditionsToCheck.push(not(methodCall(ref('ctx.args.input.containsKey'), str(ownerEntity))));

  const populateOwnerFieldExprs = new Array<Expression>();
  populateOwnerFieldExprs.push(
    qref(methodCall(ref('ctx.args.input.put'), str(ownerEntity), entityIsList ? list([ref(claimRef)]) : ref(claimRef))),
  );
  if (allowedFieldsKey && allowedFieldsCondition) {
    populateOwnerFieldExprs.push(addAllowedFieldsIfElse(allowedFieldsKey, allowedFieldsCondition));
  }

  return compoundExpression([iff(and(conditionsToCheck), compoundExpression(populateOwnerFieldExprs))]);
};

export const addAllowedFieldsIfElse = (allowedFieldsKey: string, condition: string, breakLoop = false): Expression =>
  ifElse(
    ref(condition),
    compoundExpression([set(ref(IS_AUTHORIZED_FLAG), bool(true)), ...(breakLoop ? [raw('#break')] : [])]),
    qref(methodCall(ref(`${ALLOWED_FIELDS}.addAll`), ref(allowedFieldsKey))),
  );

export const getOwnerClaimReference = (ownerClaim: string, refName: string): string => {
  const expressions: Expression[] = [];
  const identityClaims = ownerClaim.split(IDENTITY_CLAIM_DELIMITER);
  const hasMultiIdentityClaims = identityClaims.length > 1;
  let ownerRef = refName;

  if (hasMultiIdentityClaims) {
    identityClaims.forEach((_, idx) => {
      expressions.push();
      if (idx > 0) {
        ownerRef = `currentClaim${idx}`;
      }
    });
  }

  return ownerRef;
};

/**
 * Creates field resolver for owner
 */
export const generateFieldResolverForOwner = (entity: string): string => {
  const expressions: Expression[] = [
    ifElse(
      methodCall(ref('util.isList'), ref(`ctx.source.${entity}`)),
      compoundExpression([
        set(ref('ownerEntitiesList'), list([])),
        set(ref(entity), ref(`ctx.source.${entity}`)),
        forEach(ref('entities'), ref(entity), [
          set(ref('ownerEntities'), ref(`entities.split("${IDENTITY_CLAIM_DELIMITER}")`)),
          set(ref('ownerEntitiesLastIdx'), raw('$ownerEntities.size() - 1')),
          set(ref('ownerEntitiesLast'), ref('ownerEntities[$ownerEntitiesLastIdx]')),
          qref(methodCall(ref('ownerEntitiesList.add'), ref('ownerEntitiesLast'))),
        ]),
        qref(methodCall(ref(`ctx.source.${entity}.put`), ref('ownerEntitiesList'))),
        toJson(ref('ownerEntitiesList')),
      ]),
      compoundExpression([
        set(ref('ownerEntities'), ref(`ctx.source.${entity}.split("${IDENTITY_CLAIM_DELIMITER}")`)),
        set(ref('ownerEntitiesLastIdx'), raw('$ownerEntities.size() - 1')),
        set(ref('ownerEntitiesLast'), ref('ownerEntities[$ownerEntitiesLastIdx]')),
        qref(methodCall(ref('ctx.source.put'), str(entity), ref('ownerEntitiesLast'))),
        toJson(ref(`ctx.source.${entity}`)),
      ]),
    ),
  ];

  return printBlock('Parse owner field auth for Get')(compoundExpression(expressions));
};
