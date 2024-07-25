import { constructArrayFieldsStatement, constructNonScalarFieldsStatement } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { compoundExpression, Expression, list, methodCall, nul, obj, printBlock, qref, ref, set, str } from 'graphql-mapping-template';
import { ConfiguredAuthProviders, RoleDefinition } from '../../../utils';
import {
  constructAuthorizedInputStatement,
  emptyPayload,
  generateAuthRulesFromRoles,
  generateIAMAccessCheck,
  validateAuthResult,
} from './common';

export const generateAuthExpressionForCreate = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ctx: TransformerContextProvider,
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
): string => {
  return generateMutationExpression(roles, fields, 'create', providers.hasIdentityPoolId, providers.genericIamAccessEnabled, false);
};

export const generateAuthExpressionForUpdate = (
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
): string => {
  return generateMutationExpression(roles, fields, 'update', providers.hasIdentityPoolId, providers.genericIamAccessEnabled, true);
};

export const generateAuthExpressionForDelete = (
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
): string => {
  return generateMutationExpression(roles, fields, 'delete', providers.hasIdentityPoolId, providers.genericIamAccessEnabled, true);
};

const generateMutationExpression = (
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
  operation: 'create' | 'update' | 'delete',
  hasIdentityPoolId: boolean,
  enableIamAccess: boolean,
  includeExistingRecord = false,
): string => {
  const expressions = [];
  expressions.push(compoundExpression(generateAuthRulesFromRoles(roles, fields, hasIdentityPoolId, false)));
  expressions.push(
    set(
      ref('authResult'),
      includeExistingRecord
        ? methodCall(ref('util.authRules.mutationAuth'), ref('authRules'), str(operation), ref('ctx.args.input'), ref('ctx.result'))
        : methodCall(ref('util.authRules.mutationAuth'), ref('authRules'), str(operation), ref('ctx.args.input'), nul()),
    ),
  );
  expressions.push(validateAuthResult(), constructAuthorizedInputStatement('ctx.args.input'), emptyPayload);
  return printBlock('Authorization rules')(generateIAMAccessCheck(enableIamAccess, compoundExpression(expressions)));
};

export const generateAuthRequestExpression = (ctx: TransformerContextProvider, def: ObjectTypeDefinitionNode): string => {
  const mappedTableName = ctx.resourceHelper.getModelNameMapping(def.name.value);
  const operation = 'GET';
  const operationName = 'GET_EXISTING_RECORD';
  return printBlock('Get existing record')(
    compoundExpression([
      set(ref('lambdaInput'), obj({})),
      set(ref('lambdaInput.args'), obj({})),
      set(ref('lambdaInput.table'), str(mappedTableName)),
      set(ref('lambdaInput.operation'), str(operation)),
      set(ref('lambdaInput.operationName'), str(operationName)),
      set(ref('lambdaInput.args.metadata'), obj({})),
      set(ref('lambdaInput.args.metadata.keys'), list([])),
      constructNonScalarFieldsStatement(def.name.value, ctx),
      constructArrayFieldsStatement(def.name.value, ctx),
      constructFieldMappingInput(),
      qref(
        methodCall(ref('lambdaInput.args.metadata.keys.addAll'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.keys'), list([]))),
      ),
      set(
        ref('lambdaInput.args.input'),
        methodCall(ref('util.map.copyAndRetainAllKeys'), ref('context.arguments.input'), ref('ctx.stash.keys')),
      ),
      obj({
        version: str('2018-05-29'),
        operation: str('Invoke'),
        payload: methodCall(ref('util.toJson'), ref('lambdaInput')),
      }),
    ]),
  );
};

const constructFieldMappingInput = (): Expression => {
  return compoundExpression([
    set(ref('lambdaInput.args.metadata.fieldMap'), obj({})),
    qref(
      methodCall(
        ref('lambdaInput.args.metadata.fieldMap.putAll'),
        methodCall(ref('util.defaultIfNull'), ref('context.stash.fieldMap'), obj({})),
      ),
    ),
  ]);
};
