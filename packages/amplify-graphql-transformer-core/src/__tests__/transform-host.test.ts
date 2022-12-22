import { App, Stack } from 'aws-cdk-lib';
import { DefaultTransformHost } from '../transform-host';
import { GraphQLApi } from '../graphql-api';
import { InlineTemplate } from '../cdk-compat/template-asset';
import { TransformerRootStack } from '../cdk-compat/root-stack';
import { AppSyncExecutionStrategy } from '@aws-amplify/graphql-transformer-interfaces';

const NONE_DS = 'NONE_DS';

describe('DefaultTransformHost', () => {
  describe('addResolver', () => {
    const app = new App();
    const stack = new TransformerRootStack(app, 'test-root-stack');
    const transformHost = new DefaultTransformHost({ api: new GraphQLApi(stack, 'testId', { name: 'testApiName' }) });

    it('generates resolver name with hash for non-alphanumeric type names', () => {
      const cfnResolver = transformHost.addResolver(
        'test_type',
        'testField',
        new InlineTemplate('testTemplate'),
        new InlineTemplate('testTemplate'),
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
        new InlineTemplate('testTemplate'),
        new InlineTemplate('testTemplate'),
        undefined,
        undefined,
        ['testPipelineConfig'],
        stack,
      );
      expect(cfnResolver.logicalId).toMatch('testTypeTestfield6a0fResolver.LogicalID'); // have to use match instead of equals because the logicalId is a CDK token that has some non-deterministic stuff in it
    });
  });

  describe('addResolverWithStrategy', () => {
    const app = new App();
    const stack = new TransformerRootStack(app, 'test-root-stack');
    const transformHost = new DefaultTransformHost({ api: new GraphQLApi(stack, 'testId', { name: 'testApiName' }) });

    it('generates resolver name with hash for non-alphanumeric type names', () => {
      const cfnResolver = transformHost.addResolverWithStrategy(
        'test_type',
        'testField',
        {
          type: 'TEMPLATE',
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
      const cfnResolver = transformHost.addResolverWithStrategy(
        'testType',
        'test_field',
        {
          type: 'TEMPLATE',
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

    it('throws on CODE strategy type', () => {
      expect(() => {
        transformHost.addResolverWithStrategy(
          'testType',
          'test_field',
          {
            type: 'CODE',
            code: new InlineTemplate('testTemplate'),
            runtime: { name: '', runtimeVersion: '' },
          },
          undefined,
          undefined,
          ['testPipelineConfig'],
          stack,
        );
      }).toThrowErrorMatchingInlineSnapshot('"Code Execution strategies are not yet supported for top-level resolvers."');
    });
  });

  describe('addAppSyncFunctionWithStrategy', () => {
    const noopTemplateStrategy: AppSyncExecutionStrategy = {
      type: 'TEMPLATE',
      requestMappingTemplate: new InlineTemplate('testTemplate'),
      responseMappingTemplate: new InlineTemplate('testTemplate'),
    };
    const setupHostWithNoneDSAndFns = (
      ...strategies: AppSyncExecutionStrategy[]
    ): { stack: Stack, transformHost: DefaultTransformHost } => {
      const app = new App();
      const stack = new TransformerRootStack(app, 'test-root-stack');
      const transformHost = new DefaultTransformHost({ api: new GraphQLApi(stack, 'testId', { name: 'testApiName' }) });
      transformHost.addNoneDataSource(NONE_DS);
      strategies.forEach((strategy, i) => transformHost.addAppSyncFunctionWithStrategy(
        `Function${i}`,
        strategy,
        NONE_DS,
        stack,
      ));
      return { stack, transformHost };
    };

    it('throws for unknown dataSourceName', () => {
      const { stack, transformHost } = setupHostWithNoneDSAndFns();

      expect(() => {
        transformHost.addAppSyncFunctionWithStrategy(
          'TestFunction',
          noopTemplateStrategy,
          'UndefinedDataSource',
          stack,
        );
      }).toThrowErrorMatchingInlineSnapshot('"DataSource UndefinedDataSource is missing in the API"');
    });

    it('adds a template-based function without error', () => {
      const { stack, transformHost } = setupHostWithNoneDSAndFns();

      transformHost.addAppSyncFunctionWithStrategy(
        'TestFunction',
        noopTemplateStrategy,
        NONE_DS,
        stack,
      );
    });

    it('adds a code-based function without error', () => {
      const { stack, transformHost } = setupHostWithNoneDSAndFns();

      transformHost.addAppSyncFunctionWithStrategy(
        'TestFunction',
        {
          type: 'CODE',
          code: new InlineTemplate('I am code'),
          runtime: { name: '', runtimeVersion: '' },
        },
        NONE_DS,
        stack,
      );
    });
  });
});
