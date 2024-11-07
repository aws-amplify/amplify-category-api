import { resolve } from 'path';
import { DirectiveWrapper, generateGetArgumentsInput, TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider, TransformerSchemaVisitStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ResolverDirective } from '@aws-amplify/graphql-directives';
import { DirectiveNode, ObjectTypeDefinitionNode, InterfaceTypeDefinitionNode, FieldDefinitionNode } from 'graphql';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { CfnFunctionConfiguration, CfnResolver } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import { ResolverDirectiveConfiguration } from './types';

const APPSYNC_PIPELINE_RESOLVER = 'PIPELINE';
const APPSYNC_JS_RUNTIME_NAME = 'APPSYNC_JS';
const APPSYNC_JS_RUNTIME_VERSION = '1.0.0';
const JS_PIPELINE_RESOLVER_HANDLER = './assets/js-resolver-handler.js';

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
    // TODO: add vtl resolver generation
    const scope = ctx.stackManager.scope;

    for (const config of this.resolverGroups.values()) {
      const jsResolverTemplateAsset = defaultJsResolverAsset(scope);

      const { typeName, fieldName, functions: resolverEntries } = config;

      const functions: string[] = resolverEntries.map((handler, index) => {
        const fnName = `Fn_${typeName}_${fieldName}_${index + 1}`;
        const s3AssetName = `${fnName}_asset`;

        const asset = new Asset(scope, s3AssetName, {
          // todo: get reference from strategy
          path: handler.entry,
          // path: resolveEntryPath(handler.entry),
        });

        const fn = new CfnFunctionConfiguration(scope, fnName, {
          apiId: ctx.api.apiId,
          dataSourceName: handler.dataSource,
          name: fnName,
          codeS3Location: asset.s3ObjectUrl,
          runtime: {
            name: APPSYNC_JS_RUNTIME_NAME,
            runtimeVersion: APPSYNC_JS_RUNTIME_VERSION,
          },
        });
        fn.node.addDependency(ctx.api);
        return fn.attrFunctionId;
      });

      const resolverName = `Resolver_${typeName}_${fieldName}`;
      const resolver = new CfnResolver(scope, resolverName, {
        apiId: ctx.api.apiId,
        typeName,
        fieldName,
        kind: APPSYNC_PIPELINE_RESOLVER,
        codeS3Location: jsResolverTemplateAsset.s3ObjectUrl,
        runtime: {
          name: APPSYNC_JS_RUNTIME_NAME,
          runtimeVersion: APPSYNC_JS_RUNTIME_VERSION,
        },
        pipelineConfig: {
          functions,
        },
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

const defaultJsResolverAsset = (scope: Construct): Asset => {
  const resolvedTemplatePath = resolve(__dirname, JS_PIPELINE_RESOLVER_HANDLER);
  // TODO: change back
  // const resolvedTemplatePath = resolve(__dirname, '../../lib', JS_PIPELINE_RESOLVER_HANDLER);

  return new Asset(scope, 'default_js_resolver_handler_asset', {
    path: resolvedTemplatePath,
    // path: resolveEntryPath(resolvedTemplatePath),
  });
};
