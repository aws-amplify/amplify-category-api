import { compoundExpression, methodCall, printBlock, ref, set } from 'graphql-mapping-template';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { ConfiguredAuthProviders, RoleDefinition } from '../../../utils';
import { constructAuthFilter, generateAuthRulesFromRoles, validateAuthResult } from './common';

export const generateAuthExpressionForQueries = (
  ctx: TransformerContextProvider,
  providers: ConfiguredAuthProviders,
  roles: Array<RoleDefinition>,
  fields: ReadonlyArray<FieldDefinitionNode>,
  def: ObjectTypeDefinitionNode,
  indexName: string | undefined,
): string => {
  const expressions = [];
  expressions.push(compoundExpression(generateAuthRulesFromRoles(roles, fields)));
  expressions.push(
    set(
      ref('authResult'),
      methodCall(ref('util.authRules.queryAuth'), ref('authRules')),
    ),
  );
  expressions.push(
    validateAuthResult(),
    constructAuthFilter(),
  );
  return printBlock('Authorization rules')(compoundExpression(expressions));
};
