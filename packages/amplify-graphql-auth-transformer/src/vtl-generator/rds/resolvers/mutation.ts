import { compoundExpression, list, methodCall, obj, printBlock, qref, ref, set, str } from 'graphql-mapping-template';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ConfiguredAuthProviders, RoleDefinition } from '../../../utils';
import { constructAuthorizedInputStatement, emptyPayload, generateAuthRulesFromRoles, validateAuthResult } from './common';

export const generateAuthExpressionForCreate = (
  ctx: TransformerContextProvider,
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
): string => {
  return generateMutationExpression(roles, fields, 'create', false, providers.identityPoolId);
};

export const generateAuthExpressionForUpdate = (
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
): string => {
  return generateMutationExpression(roles, fields, 'update', true, providers.identityPoolId);
};

export const generateAuthExpressionForDelete = (
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
): string => {
  return generateMutationExpression(roles, fields, 'delete', true, providers.identityPoolId);
};

const generateMutationExpression = (
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
  operation: 'create' | 'update' | 'delete',
  includeExistingRecord = false,
  identityPoolId?: string,
): string => {
  const expressions = [];
  expressions.push(compoundExpression(generateAuthRulesFromRoles(roles, fields, false, identityPoolId)));
  expressions.push(
    set(
      ref('authResult'),
      includeExistingRecord
        ? methodCall(ref('util.authRules.mutationAuth'), ref('authRules'), str(operation), ref('ctx.args.input'), ref('ctx.source'))
        : methodCall(ref('util.authRules.mutationAuth'), ref('authRules'), str(operation), ref('ctx.args.input')),
    ),
  );
  expressions.push(validateAuthResult(), constructAuthorizedInputStatement('ctx.args.input'), emptyPayload);
  return printBlock('Authorization rules')(compoundExpression(expressions));
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
