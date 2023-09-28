import { Expression, and, bool, compoundExpression, iff, list, methodCall, not, notEquals, obj, or, parens, printBlock, qref, raw, ref, set, str, toJson } from 'graphql-mapping-template';
import { FieldDefinitionNode } from 'graphql';
import { API_KEY_AUTH_TYPE, RoleDefinition } from '../../../utils';

/**
 * Generates default RDS expression
 */
export const generateDefaultRDSExpression = (): string => {
  const exp = methodCall(ref('util.unauthorized'));
  return printBlock('Default RDS Auth Resolver')(compoundExpression([exp, toJson(obj({}))]));
};

export const generateAuthRulesFromRoles = (roles: Array<RoleDefinition>, fields: Readonly<FieldDefinitionNode[]>): Expression[] => {
  const expressions = [];
  expressions.push(
    qref(methodCall(ref('ctx.stash.put'), str('hasAuth'), bool(true))),
    set(ref('authRules'), list([])),
  );
  const fieldNames = fields.map((field) => field.name.value);
  roles.forEach((role) => {
    expressions.push(convertAuthRoleToVtl(role, fieldNames));
  });
  return expressions;
};

const convertAuthRoleToVtl = (role: RoleDefinition, fields: string[]): Expression => {
  const allowedFields = getAllowedFields(role, fields).map((field) => str(field));

  // Api Key
  if (role.provider === 'apiKey') {
    return qref(
      methodCall(
        ref('authRules.add'),
        obj({
          type: str('public'),
          provider: str('apiKey'),
          ...(allowedFields && allowedFields.length > 0) && { allowedFields: list(allowedFields) },
        })
      )
    );
  }

  // Lambda Authorizer
  else if (role.provider === 'function') {
    return qref(
      methodCall(
        ref('authRules.add'),
        obj({
          type: str('custom'),
          provider: str('function'),
          ...(allowedFields && allowedFields.length > 0) && { allowedFields: list(allowedFields) },
        })
      )
    );
  }

  // IAM
  else if (role.provider === 'iam') {
    return qref(
      methodCall(
        ref('authRules.add'),
        obj({
          type: str(role.strategy),
          provider: str('iam'),
          roleArn: role.strategy === 'public' ? ref('ctx.stash.unauthRole') : ref('ctx.stash.authRole'),
          cognitoIdentityPoolId: ref('ctx.identity.cognitoIdentityPoolId'),
          ...(allowedFields && allowedFields.length > 0) && { allowedFields: list(allowedFields) },
        })
      )
    );
  }

  // User Pools or OIDC
  else if (role.provider === 'userPools' || role.provider === 'oidc') {
    if (role.strategy === 'private') {
      return qref(
        methodCall(
          ref('authRules.add'),
          obj({
            type: str(role.strategy),
            provider: str('userPools'),
            allowedFields: list(getAllowedFields(role, fields).map((field) => str(field))),
          })
        )
      );
    }
    else if (role.strategy === 'groups' && role.static) {
      return qref(
        methodCall(
          ref('authRules.add'),
          obj({
            type: str(role.strategy),
            provider: str('userPools'),
            allowedGroups: list([str(role.entity)]),
            identityClaim: str(role.claim), 
            allowedFields: list(getAllowedFields(role, fields).map((field) => str(field))),
          })
        )
      );
    }
    else if (role.strategy === 'owner') {
      return qref(
        methodCall(
          ref('authRules.add'),
          obj({
            type: str(role.strategy),
            provider: str('userPools'),
            ownerFieldName: str(role.entity),
            ownerFieldType: str(role.isEntityList ? 'string[]' : 'string'),
            identityClaim: str(role.claim), 
            ...(allowedFields && allowedFields.length > 0) && { allowedFields: list(allowedFields) },
          })
        )
      );
    }
    else if (role.strategy === 'groups' && !role.static) {
      return qref(
        methodCall(
          ref('authRules.add'),
          obj({
            type: str(role.strategy),
            provider: str('userPools'),
            groupsFieldName: str(role.entity),
            groupsFieldType: str(role.isEntityList ? 'string[]' : 'string'),
            groupClaim: str(role.claim), 
            ...(allowedFields && allowedFields.length > 0) && { allowedFields: list(allowedFields) },
          })
        )
      );
    }
  }
  throw new Error(`Invalid Auth Rule: Unable to process ${JSON.stringify(role)}`);  
};

const getAllowedFields = (role: RoleDefinition, fields: string[]): string[] => {
  if (role.allowedFields && role.allowedFields.length > 1) {
    return role.allowedFields;
  }
  return fields;
};

export const validateAuthResult = (): Expression => {
  return compoundExpression([
    iff(
      or ([
        not(ref('authResult')),
        parens(
          and([
            ref('authResult'),
            not(ref('authResult.authorized')),
          ]),
        ),
      ]),
      ref('util.unauthorized'),
    ),
  ]);
};

export const constructAuthFilter = (): Expression => {
  return iff(
    and([
      ref('authResult'),
      not(methodCall(ref('util.isNullOrEmpty'), ref('authResult.authFilter'))),
    ]),
    set(ref('ctx.stash.authFilter'), ref('authResult.authFilter')),
  );
};

export const constructAuthorizedInputStatement = (keyName: string): Expression => 
iff(
  and([
    ref('authResult'),
    not(methodCall(ref('util.isNullOrEmpty'), ref('authResult.authorizedInput'))),
  ]),
  set(ref(keyName), ref('authResult.authorizedInput')),
);

/**
 * Generates sandbox expression for field
 */
export const generateSandboxExpressionForField = (sandboxEnabled: boolean): string => {
  let exp: Expression;
  if (sandboxEnabled) exp = iff(notEquals(methodCall(ref('util.authType')), str(API_KEY_AUTH_TYPE)), methodCall(ref('util.unauthorized')));
  else exp = methodCall(ref('util.unauthorized'));
  return printBlock(`Sandbox Mode ${sandboxEnabled ? 'Enabled' : 'Disabled'}`)(compoundExpression([exp, toJson(obj({}))]));
};
