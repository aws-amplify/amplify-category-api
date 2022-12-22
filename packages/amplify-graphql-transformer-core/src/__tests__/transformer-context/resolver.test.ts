import { AppSyncExecutionStrategy, DataSourceProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { App, Stack } from '@aws-cdk/core';
import { InlineTemplate, S3MappingTemplate, TransformerRootStack } from '../../cdk-compat';
import { GraphQLApi } from '../../graphql-api';
import { DefaultTransformHost } from '../../transform-host';
import { ResolverManager, TransformerResolver } from '../../transformer-context/resolver';

const NONE_DS = 'NONE_DS';
const noopDataSourceProvider = {} as DataSourceProvider;
const noopTemplate = new InlineTemplate('mylogic');
const noopTemplateStrategy: AppSyncExecutionStrategy = {
  type: 'TEMPLATE',
  requestMappingTemplate: noopTemplate,
  responseMappingTemplate: noopTemplate,
};
const noopCodeStrategy: AppSyncExecutionStrategy = {
  type: 'CODE',
  code: noopTemplate,
  runtime: { name: '', runtimeVersion: '' },
};

describe('ResolverManager', () => {
  describe('generateQueryResolver', () => {
    it('can be invoked, and generates a TransformerResolver', () => {
      const manager = new ResolverManager();

      const resolver = manager.generateQueryResolver(
        'Query',
        'getTodo',
        'QuerygetTodoResolver',
        noopDataSourceProvider,
        noopTemplate,
        noopTemplate,
      );

      expect(resolver).toBeDefined();
    });
  });

  describe('generateQueryResolverWithStrategy', () => {
    it('can be invoked with a Code execution strategy, and generates a TransformerResolver', () => {
      const manager = new ResolverManager();

      const resolver = manager.generateQueryResolverWithStrategy(
        'Query',
        'getTodo',
        'QuerygetTodoResolver',
        noopDataSourceProvider,
        noopCodeStrategy,
      );

      expect(resolver).toBeDefined();
    });
  });

  describe('generateMutationResolver', () => {
    it('can be invoked, and generates a TransformerResolver', () => {
      const manager = new ResolverManager();

      const resolver = manager.generateMutationResolver(
        'Mutation',
        'createTodo',
        'MutationcreateTodoResolver',
        noopDataSourceProvider,
        new InlineTemplate('mylogic'),
        new InlineTemplate('mylogic'),
      );

      expect(resolver).toBeDefined();
    });
  });

  describe('generateMutationResolverWithStrategy', () => {
    it('can be invoked with a Code execution strategy, and generates a TransformerResolver', () => {
      const manager = new ResolverManager();

      const resolver = manager.generateMutationResolverWithStrategy(
        'Mutation',
        'createTodo',
        'MutationcreateTodoResolver',
        noopDataSourceProvider,
        noopCodeStrategy,
      );

      expect(resolver).toBeDefined();
    });
  });

  describe('generateSubscriptionResolver', () => {
    it('can be invoked, and generates a TransformerResolver', () => {
      const manager = new ResolverManager();

      const resolver = manager.generateSubscriptionResolver(
        'Subscription',
        'onTodoUpdate',
        'SubscriptionOnTodoUpdateResolver',
        new InlineTemplate('mylogic'),
        new InlineTemplate('mylogic'),
      );

      expect(resolver).toBeDefined();
    });
  });

  describe('generateSubscriptionResolverWithStrategy', () => {
    it('can be invoked with a Code execution strategy, and generates a TransformerResolver', () => {
      const manager = new ResolverManager();

      const resolver = manager.generateSubscriptionResolverWithStrategy(
        'Subscription',
        'onTodoUpdate',
        'SubscriptionOnTodoUpdateResolver',
        noopCodeStrategy,
      );

      expect(resolver).toBeDefined();
    });
  });
});

describe('TransformerResolver', () => {
  const slotName = 'init';
  let resolver: TransformerResolver;

  const setupSynthState = (): { stack: Stack, api: GraphQLApi } => {
    const app = new App();
    const stack = new TransformerRootStack(app, 'test-root-stack');

    // This is weird, but the transformHost must take in an api in it's constructor
    // that API also needs the transformHost, which can't be set after initialization
    // So we do this two-round create w/ a dummy, then update the referances
    const dummyApi = new GraphQLApi(stack, 'dummyApi', { name: 'dummyApiName' });
    const transformHost = new DefaultTransformHost({ api: dummyApi });
    const api = new GraphQLApi(stack, 'testId2', { name: 'testApiName', host: transformHost });
    transformHost.setAPI(api);

    transformHost.addNoneDataSource(NONE_DS);

    return { stack, api };
  };

  beforeEach(() => {
    resolver = TransformerResolver.fromStrategy({
      typeName: 'Query',
      fieldName: 'getTodo',
      resolverLogicalId: 'QuerygetTodoResolver',
      requestSlots: [slotName],
      responseSlots: [],
      strategy: noopCodeStrategy,
    });
  });

  describe('addToSlot', () => {
    it('can be invoked as a proxy to addToSlotWithStrategy', () => {
      resolver.addToSlot(slotName, noopTemplate, noopTemplate, noopDataSourceProvider);
      
      const { stack, api } = setupSynthState();

      const synthesizedResolvers = resolver.synthesizeResolvers(stack, api, [slotName]);
      expect(synthesizedResolvers.length).toEqual(1);
    });
  });

  describe('addToSlotWithStrategy', () => {
    it('can add a new template function to an empty slot', () => {
      resolver.addToSlotWithStrategy(
        slotName,
        noopTemplateStrategy,
        noopDataSourceProvider,
      );
      
      const { stack, api } = setupSynthState();

      const synthesizedResolvers = resolver.synthesizeResolvers(stack, api, [slotName]);
      expect(synthesizedResolvers.length).toEqual(1);
    });

    it('can add a new code function to an empty slot', () => {
      resolver.addToSlotWithStrategy(
        slotName,
        noopCodeStrategy,
        noopDataSourceProvider,
      );
      
      const { stack, api } = setupSynthState();

      const synthesizedResolvers = resolver.synthesizeResolvers(stack, api, [slotName]);
      expect(synthesizedResolvers.length).toEqual(1);
    });

    it('will append a function for inline functions regardless of type', () => {
      resolver.addToSlotWithStrategy(slotName, noopTemplateStrategy);
      resolver.addToSlotWithStrategy(slotName, noopTemplateStrategy);
      resolver.addToSlotWithStrategy(slotName, noopCodeStrategy);
      resolver.addToSlotWithStrategy(slotName, noopCodeStrategy);
      
      const { stack, api } = setupSynthState();

      const synthesizedResolvers = resolver.synthesizeResolvers(stack, api, [slotName]);
      expect(synthesizedResolvers.length).toEqual(4);
    });

    it('will update request and response override templates', () => {
      const requestMappingTemplate1 = new InlineTemplate('myrequestmappinglogic');
      (requestMappingTemplate1 as any).name = 'Query.getTodo.init.1.req.vtl';
      const responseMappingTemplate1 = new InlineTemplate('myresponsemappinglogic');
      (responseMappingTemplate1 as any).name = 'Query.getTodo.init.1.res.vtl';
      const requestMappingTemplate2 = new InlineTemplate('myupdatedrequestmappinglogic');
      (requestMappingTemplate2 as any).name = 'Query.getTodo.init.1.req.vtl';
      const responseMappingTemplate2 = new InlineTemplate('myupdatedresponsemappinglogic');
      (responseMappingTemplate2 as any).name = 'Query.getTodo.init.1.res.vtl';
      resolver.addToSlotWithStrategy(slotName, {
        type: 'TEMPLATE',
        requestMappingTemplate: requestMappingTemplate1,
        responseMappingTemplate: responseMappingTemplate1,
      });
      resolver.addToSlotWithStrategy(slotName, {
        type: 'TEMPLATE',
        requestMappingTemplate: requestMappingTemplate2,
        responseMappingTemplate: responseMappingTemplate2,
      });

      const { stack, api } = setupSynthState();

      const synthesizedResolvers = resolver.synthesizeResolvers(stack, api, [slotName]);
      expect(synthesizedResolvers.length).toEqual(1);
      expect((synthesizedResolvers[0] as any).function.requestMappingTemplate).toEqual('myupdatedrequestmappinglogic');
      expect((synthesizedResolvers[0] as any).function.responseMappingTemplate).toEqual('myupdatedresponsemappinglogic');
    });

    it('will update request and response override templates with code', () => {
      const requestMappingTemplate = new InlineTemplate('myrequestmappinglogic');
      (requestMappingTemplate as any).name = 'Query.getTodo.init.1.req.vtl';
      const responseMappingTemplate = new InlineTemplate('myresponsemappinglogic');
      (responseMappingTemplate as any).name = 'Query.getTodo.init.1.res.vtl';
      const code = new InlineTemplate('myupdatedcode');
      (code as any).name = 'Query.getTodo.init.1.js';
      resolver.addToSlotWithStrategy(slotName, {
        type: 'TEMPLATE',
        requestMappingTemplate,
        responseMappingTemplate,
      });
      resolver.addToSlotWithStrategy(slotName, {
        type: 'CODE',
        code,
        runtime: { name: 'APP_SYNC_JS', runtimeVersion: '1.0.0' },
      });

      const { stack, api } = setupSynthState();

      const synthesizedResolvers = resolver.synthesizeResolvers(stack, api, [slotName]);
      expect(synthesizedResolvers.length).toEqual(1);
      expect((synthesizedResolvers[0] as any).function._cfnProperties.Code).toEqual('myupdatedcode');
    });
  });
});
