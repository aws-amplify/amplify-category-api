import * as cdk from 'aws-cdk-lib';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { createModelOutputExportName } from '../resources/dynamo-model-resource-generator';

describe('createModelOutputExportName', () => {
  const createContext = (apiId: string): TransformerContextProvider =>
    ({
      api: {
        apiId,
      },
    } as unknown as TransformerContextProvider);

  it('keeps export names when they do not contain forbidden CloudFormation references', () => {
    const stack = new cdk.Stack();

    expect(createModelOutputExportName(stack, createContext('api-id'), 'PostTable', 'Name')).toBeDefined();
  });

  it('omits export names that depend on imported values', () => {
    const stack = new cdk.Stack();

    expect(createModelOutputExportName(stack, createContext(cdk.Fn.importValue('GraphQLApiId')), 'PostTable', 'Name')).toBeUndefined();
  });
});
