import { CfnMapping, Fn, Stack } from 'aws-cdk-lib';
import {
  Expression,
  compoundExpression,
  ifElse,
  list,
  methodCall,
  obj,
  printBlock,
  qref,
  ref,
  set,
  str,
  toJson
} from 'graphql-mapping-template';
import { ResourceConstants } from 'graphql-transformer-common';

import { RDSConnectionSecrets } from '@aws-amplify/graphql-transformer-core';
import { GraphQLAPIProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  Effect,
  IRole,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { IFunction, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path from 'path';

export type OPERATIONS = 'CREATE' | 'UPDATE' | 'DELETE' | 'GET' | 'LIST' | 'SYNC';

const OPERATION_KEY = '__operation';

const RDSLayerMappingID = 'RDSLayerResourceMapping';
// TODO: This is temporary state, we need to modify this to a production layer
export const setRDSLayerMappings = (scope: Construct): CfnMapping => new CfnMapping(
  scope,
  RDSLayerMappingID,
  {
    mapping: {
      'ap-northeast-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'us-east-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'ap-southeast-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'eu-west-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'us-west-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'ap-east-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'ap-northeast-2': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'ap-northeast-3': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'ap-south-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'ap-southeast-2': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'ca-central-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'eu-central-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'eu-north-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'eu-west-2': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'eu-west-3': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'sa-east-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'us-east-2': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'us-west-2': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'cn-north-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'cn-northwest-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'us-gov-west-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'us-gov-east-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
      'me-south-1': {
        layerRegion: 'arn:aws:lambda:us-east-1:956468067974:layer:AmplifyRDSLayerBeta:7',
      },
    },
  },
);

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
    Runtime.NODEJS_16_X,
    [
      LayerVersion.fromLayerVersionArn(
        stack,
        'SQLLambdaLayerVersion',
        Fn.findInMap(RDSLayerMappingID, Fn.ref('AWS::Region'), 'layerRegion'),
      ),
    ],
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
        resources: [
          `arn:aws:ssm:*:*:parameter${secretEntry.username}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.password}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.host}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.database}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.port}`,
        ],
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
