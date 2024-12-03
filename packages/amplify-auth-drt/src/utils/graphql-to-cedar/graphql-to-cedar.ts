import { DocumentNode, ObjectTypeDefinitionNode, parse } from 'graphql';
import { isObjectTypeDefinitionNode } from '@aws-amplify/graphql-transformer-core';
import { getDirectivesNamed, hasDirectiveNamed } from '../graphql-utils';
import { CedarPolicy } from './cedar-policy';
import { isAuthDirective } from './auth-directive';
import { createPolicyFromAuthDirectiveRuleValuePublic, isAuthDirectiveRulePublic } from './auth-directive-rule-public';

export interface CedarBundle {
  policies: CedarPolicy[];
}

export const graphqlToCedar = (graphqlSchema: string): CedarBundle => {
  return {
    policies: parsePolicies(graphqlSchema),
  };
};

/*
 *  type Todo @model @auth(rules: [{ allow: public }]) {
 *    id: ID!
 *    content: String
 *  }
 */
const parsePolicies = (graphqlSchema: string): CedarPolicy[] => {
  const doc = parse(graphqlSchema);
  const authorizedModels = findAuthorizedModels(doc);
  const policies = authorizedModels.flatMap(createCedarPolicies);
  return policies;
};

const findAuthorizedModels = (doc: DocumentNode): ObjectTypeDefinitionNode[] => findModels(doc).filter((m) => hasDirectiveNamed(m, 'auth'));

const findModels = (doc: DocumentNode): ObjectTypeDefinitionNode[] =>
  doc.definitions.filter(isObjectTypeDefinitionNode).filter(isModelNode);

export const isModelNode = (obj: ObjectTypeDefinitionNode): boolean => {
  return hasDirectiveNamed(obj, 'model');
};

const createCedarPolicies = (model: ObjectTypeDefinitionNode): CedarPolicy[] => {
  const authDirective = getDirectivesNamed(model, 'auth')[0];
  if (!isAuthDirective(authDirective)) {
    throw new Error(`Unrecognized auth directive: ${JSON.stringify(authDirective)}`);
  }
  const policies: CedarPolicy[] = [];

  for (const rule of authDirective.arguments[0].value.values) {
    if (isAuthDirectiveRulePublic(rule)) {
      policies.push(createPolicyFromAuthDirectiveRuleValuePublic(rule, model));
    }
  }

  return policies;
};
