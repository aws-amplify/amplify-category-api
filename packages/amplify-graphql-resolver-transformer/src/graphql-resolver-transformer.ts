import { DirectiveWrapper, generateGetArgumentsInput, TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider, TransformerSchemaVisitStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ResolverDirective } from '@aws-amplify/graphql-directives';
import { DirectiveNode, ObjectTypeDefinitionNode, InterfaceTypeDefinitionNode, FieldDefinitionNode } from 'graphql';
import { AppsyncFunction, Code, FunctionRuntime, IAppsyncFunction, Resolver } from 'aws-cdk-lib/aws-appsync';
import { ResolverDirectiveConfiguration } from './types';

// TODO: import
const NONE_DS = 'NONE_DS';

export class ResolverTransformer extends TransformerPluginBase {
  private resolverGroups: Map<FieldDefinitionNode, ResolverDirectiveConfiguration> = new Map();

  constructor() {
    super('amplify-resolver-transformer', ResolverDirective.definition);
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    acc: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveWrapped = new DirectiveWrapper(directive);
    const config = directiveWrapped.getArguments(
      {
        typeName: parent.name.value,
        fieldName: definition.name.value,
        functions: [],
      } as ResolverDirectiveConfiguration,
      generateGetArgumentsInput(acc.transformParameters),
    );
    validateResolverConfig(config);
    this.resolverGroups.set(definition, config);
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    const scope = ctx.stackManager.scope;

    for (const config of this.resolverGroups.values()) {
      const { typeName, fieldName, functions: resolverEntries } = config;

      const functions: IAppsyncFunction[] = resolverEntries.map((handler, index) => {
        const fnName = `Fn_${typeName}_${fieldName}_${index + 1}`;
        let dataSource;
        if (handler.dataSource !== 'NONE_DS') {
          // TODO: fix type error
          dataSource = ctx.dataSources.get({ name: { value: handler.dataSource, kind: 'Name' }, kind: 'ObjectTypeDefinition' }) as any;
        } else if (handler.dataSource === 'NONE_DS') {
          // TODO: set to correct none ds
          dataSource = ctx.api.host.getDataSource(NONE_DS);
        } else {
          // TODO: improve error message
          throw new Error('Invalid data source');
        }

        const fn = new AppsyncFunction(scope, fnName, {
          name: fnName,
          // TODO: fix type error
          api: ctx.api as any,
          dataSource,
          runtime: FunctionRuntime.JS_1_0_0,
          // TODO: change to reference from entry
          code: Code.fromAsset(handler.entry),
        });
        return fn;
      });
      const resolverName = `Resolver_${typeName}_${fieldName}`;
      const setApiIdInStash = `ctx.stash.apiId = '${ctx.api.apiId}';`;
      const tableNames = Array.from(ctx.dataSources.collectDataSources().entries()).map(([modelName, dataSource]) => {
        // TODO: fix type error
        // @ts-ignore
        return [modelName, dataSource.ds.dynamoDbConfig.tableName];
      });
      const setTableNamesInStash = tableNames.map(([modelName, tableName]) => `ctx.stash.${modelName} = '${tableName}';`);
      const resolver = new Resolver(scope, resolverName, {
        api: ctx.api as any,
        typeName,
        fieldName,
        pipelineConfig: functions,
        code: Code.fromInline(`
          export function request(ctx) {
            ${setApiIdInStash}
            ${setTableNamesInStash.join('\n')}
            return {}
          }

          export function response(ctx) {
            return ctx.prev.result
          }
        `),
        runtime: FunctionRuntime.JS_1_0_0,
      });
      resolver.node.addDependency(ctx.api);
    }
  };
}

const validateResolverConfig = (config: ResolverDirectiveConfiguration): void => {
  const { typeName, fieldName, functions } = config;
  if (!typeName || !fieldName || !functions || functions.length === 0) {
    throw new Error('Invalid resolver configuration');
  }
};
