import {
  and,
  comment,
  compoundExpression,
  CompoundExpressionNode,
  equals,
  Expression,
  ifElse,
  iff,
  int,
  methodCall,
  notEquals,
  obj,
  printBlock,
  qref,
  ref,
  set,
  str,
  toJson,
} from 'graphql-mapping-template';
import { OPERATION_KEY } from '../../definitions';

/**
 * Helper method to generate code that converts DynamoDB condition object to condition
 * expression
 * @param inputConditionObjectName : Variable in stash that holds condition object
 * @param conditionOutputVariableName: Variable to store generated DDB expression
 */
export const generateConditionSlot = (inputConditionObjectName: string, conditionOutputVariableName: string): CompoundExpressionNode => {
  const statements: Expression[] = [
    comment('Start condition block'),

    iff(
      and([ref(inputConditionObjectName), notEquals(methodCall(ref(`${inputConditionObjectName}.size`)), int(0))]),
      compoundExpression([
        set(ref('mergedConditions'), obj({ and: ref(inputConditionObjectName) })),
        set(
          ref(conditionOutputVariableName),
          methodCall(ref('util.parseJson'), methodCall(ref('util.transform.toDynamoDBConditionExpression'), ref('mergedConditions'))),
        ),
        iff(
          and([
            ref(`${conditionOutputVariableName}.expressionValues`),
            equals(methodCall(ref(`${conditionOutputVariableName}.expressionValues.size`)), int(0)),
          ]),
          set(
            ref(conditionOutputVariableName),
            obj({
              expression: ref(`${conditionOutputVariableName}.expression`),
              expressionNames: ref(`${conditionOutputVariableName}.expressionNames`),
            }),
          ),
        ),
        comment('End condition block'),
      ]),
    ),
  ];
  return compoundExpression(statements);
};

/**
 * Generate common response template used by most of the resolvers.
 * Append operation if response is coming from a mutation, this is to protect field resolver for subscriptions
 */
export const generateDefaultResponseMappingTemplate = (isSyncEnabled: boolean, mutation = false): string => {
  const statements: Expression[] = [];
  if (mutation) statements.push(qref(methodCall(ref('ctx.result.put'), str(OPERATION_KEY), str('Mutation'))));
  if (isSyncEnabled) {
    statements.push(
      ifElse(
        ref('ctx.error'),
        methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type'), ref('ctx.result')),
        toJson(ref('ctx.result')),
      ),
    );
  } else {
    statements.push(
      ifElse(ref('ctx.error'), methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type')), toJson(ref('ctx.result'))),
    );
  }

  return printBlock('ResponseTemplate')(compoundExpression(statements));
};
