import { DDB_DEFAULT_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyGraphqlApi } from '../../amplify-graphql-api';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { IAmplifyGraphqlDefinition } from '../../types';

/** Helper for combining definitions into a test stack with API Key Config */
export const makeApiByCombining = (...definitions: IAmplifyGraphqlDefinition[]): AmplifyGraphqlApi => {
  const combinedDefinition = AmplifyGraphqlDefinition.combine(definitions);
  const stack = new cdk.Stack();
  const api = new AmplifyGraphqlApi(stack, 'TestSqlBoundApi', {
    definition: combinedDefinition,
    authorizationModes: {
      apiKeyConfig: { expires: cdk.Duration.days(7) },
    },
  });
  return api;
};

/**
 * Utility to wrap construct creation a basic synth step to smoke test
 * @param schema schema to synthesize
 */
export const verifySchema = (schema: string, datasourceStrategy: ModelDataSourceStrategy = DDB_DEFAULT_DATASOURCE_STRATEGY): void => {
  const stack = new cdk.Stack();
  new AmplifyGraphqlApi(stack, 'TestApi', {
    definition: AmplifyGraphqlDefinition.fromString(schema, datasourceStrategy),
    authorizationModes: {
      apiKeyConfig: { expires: cdk.Duration.days(7) },
    },
  });
  Template.fromStack(stack);
};
