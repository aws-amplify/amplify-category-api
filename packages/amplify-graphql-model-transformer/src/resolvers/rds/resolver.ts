// TODO: Split this file into seperated query, mutations and subscriptions files.

import {
  str,
  Expression,
  ref,
  methodCall,
  obj,
  qref,
  ifElse,
  compoundExpression,
  iff,
  toJson,
  printBlock,
  and,
  not,
  equals,
  int,
  nul,
  set,
  list,
} from 'graphql-mapping-template';
import { ResourceConstants } from 'graphql-transformer-common';
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Effect,
  IRole,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { GraphQLAPIProvider } from '@aws-amplify/graphql-transformer-interfaces';
import path from 'path';
import {RDSConnectionSecrets} from '@aws-amplify/graphql-transformer-core';

export type OPERATIONS = 'CREATE' | 'UPDATE' | 'DELETE' | 'GET' | 'LIST' | 'SYNC';

const OPERATION_KEY = '__operation';

export const createRdsLambda = (
  stack: Stack,
  apiGraphql: GraphQLAPIProvider,
  lambdaRole: IRole,
  environment?: { [key: string]: string },
): IFunction => {
  const { RDSLambdaLogicalID } = ResourceConstants.RESOURCES;

  return apiGraphql.host.addLambdaFunction(
    RDSLambdaLogicalID,
    `functions/${RDSLambdaLogicalID}.zip`,
    'handler.run',
    path.resolve(__dirname, '..', '..', '..', 'lib', 'rds-lambda.zip'),
    Runtime.NODEJS_18_X,
    [],
    lambdaRole,
    environment,
    undefined,
    stack,
  );
};

export const createRdsLambdaRole = (roleName: string, stack: Construct, secretEntry: RDSConnectionSecrets): IRole => {
  const { RDSLambdaIAMRoleLogicalID } = ResourceConstants.RESOURCES;
  const role = new Role(stack, RDSLambdaIAMRoleLogicalID, {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    roleName,
  });
  const policyStatements = [
    new PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      effect: Effect.ALLOW,
      resources: ['arn:aws:logs:*:*:*'],
    })
  ];
  if (secretEntry) {
    policyStatements.push(
      new PolicyStatement({
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        effect: Effect.ALLOW,
        resources: [`arn:aws:ssm:*:*:parameter${secretEntry.username}`, `arn:aws:ssm:*:*:parameter${secretEntry.password}`],
      })
    )
  }
  role.attachInlinePolicy(
    new Policy(stack, 'CloudwatchLogsAccess', {
      statements: policyStatements,
    }),
  );

  return role;
};

export const generateLambdaRequestTemplate = (tableName: string, operation: string, operationName: string): string => {
  return printBlock('Invoke RDS Lambda data source')(
    compoundExpression([
      set(ref('lambdaInput'), obj({})),
      set(ref('lambdaInput.args'), obj({})),
      set(ref('lambdaInput.table'), str(tableName)),
      set(ref('lambdaInput.operation'), str(operation)),
      set(ref('lambdaInput.operationName'), str(operationName)),
      set(ref('lambdaInput.args.metadata'), obj({})),
      set(ref('lambdaInput.args.metadata.keys'), list([])),
      qref(methodCall(ref('lambdaInput.args.metadata.keys.addAll'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.keys'), list([])))),
      set(ref('lambdaInput.args.input'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.defaultValues'), obj({}))),
      qref(methodCall(ref('lambdaInput.args.input.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments'), obj({})))),
      obj({
        version: str('2018-05-29'),
        operation: str('Invoke'),
        payload: methodCall(ref('util.toJson'), ref('lambdaInput')),
      }),
    ]),
  );
};

export const generateGetLambdaResponseTemplate = (isSyncEnabled: boolean): string => {
  const statements: Expression[] = [];
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

/**
 * Generate common response template used by most of the resolvers.
 * Append operation if response is coming from a mutation, this is to protect field resolver for subscriptions
 */
export const generateDefaultLambdaResponseMappingTemplate = (isSyncEnabled: boolean, mutation = false): string => {
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
