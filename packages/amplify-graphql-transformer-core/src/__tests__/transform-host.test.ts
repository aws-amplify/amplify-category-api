import { App, Stack } from 'aws-cdk-lib';
import { DefaultTransformHost } from '../transform-host';
import { GraphQLApi } from '../graphql-api';
import { InlineTemplate } from '../cdk-compat/template-asset';

describe('addResolver', () => {
  const app = new App();
  const stack = new Stack(app, 'test-root-stack');
  const transformHost = new DefaultTransformHost({
    api: new GraphQLApi(stack, 'testId', { name: 'testApiName', assetProvider: { provide: jest.fn() } }),
  });

  it('generates resolver name with hash for non-alphanumeric type names', () => {
    const cfnResolver = transformHost.addResolver(
      'test_type',
      'testField',
      {
        requestMappingTemplate: new InlineTemplate('testTemplate'),
        responseMappingTemplate: new InlineTemplate('testTemplate'),
      },
      undefined,
      undefined,
      ['testPipelineConfig'],
      stack,
    );
    expect(cfnResolver.logicalId).toMatch('testtype4c79TestFieldResolver.LogicalID'); // have to use match instead of equals because the logicalId is a CDK token that has some non-deterministic stuff in it
  });

  it('generates resolver name with hash for non-alphanumeric field names', () => {
    const cfnResolver = transformHost.addResolver(
      'testType',
      'test_field',
      {
        requestMappingTemplate: new InlineTemplate('testTemplate'),
        responseMappingTemplate: new InlineTemplate('testTemplate'),
      },
      undefined,
      undefined,
      ['testPipelineConfig'],
      stack,
    );
    expect(cfnResolver.logicalId).toMatch('testTypeTestfield6a0fResolver.LogicalID'); // have to use match instead of equals because the logicalId is a CDK token that has some non-deterministic stuff in it
  });
});
