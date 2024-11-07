import { DirectiveWrapper, generateGetArgumentsInput, TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider, TransformerSchemaVisitStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ResolverDirective } from '@aws-amplify/graphql-directives';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DirectiveNode, ObjectTypeDefinitionNode, InterfaceTypeDefinitionNode, FieldDefinitionNode } from 'graphql';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { resolveEntryPath } from './resolve-entry-path';
import { CfnFunctionConfiguration, CfnResolver } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import { resolve } from 'path';
import { fileURLToPath } from 'node:url';

const APPSYNC_PIPELINE_RESOLVER = 'PIPELINE';
const APPSYNC_JS_RUNTIME_NAME = 'APPSYNC_JS';
const APPSYNC_JS_RUNTIME_VERSION = '1.0.0';
const JS_PIPELINE_RESOLVER_HANDLER = './assets/js_resolver_handler.js';

type ResolverDirectiveConfiguration = {
  typeName: string;
  fieldName: string;
  functions: ResolverFunction[];
};

type ResolverFunction = {
  dataSource: string;
  entry: string;
};

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
    const scope = ctx.stackManager.scope

    for (const [field, config] of this.resolverGroups.entries()) {
      const jsResolverTemplateAsset = defaultJsResolverAsset(scope);

      const { typeName, fieldName, functions: resolverEntries } = config;

      const functions: string[] = resolverEntries.map((handler, idx) => {
        const fnName = `Fn_${typeName}_${fieldName}_${idx + 1}`;
        const s3AssetName = `${fnName}_asset`;
  
        const asset = new Asset(scope, s3AssetName, {
          path: resolveEntryPath(handler.entry),
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
      new CfnResolver(scope, resolverName, {
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
      }).node.addDependency(ctx.api);
    }
  }
}

const validateResolverConfig = (config: ResolverDirectiveConfiguration): void =>  {
  const { typeName, fieldName, functions } = config;
  if (!typeName || !fieldName || !functions || functions.length === 0) {
    throw new Error('Invalid resolver configuration');
  }
}

const defaultJsResolverAsset = (scope: Construct): Asset => {
  const resolvedTemplatePath = resolve(
    __dirname,
    '../../lib',
    JS_PIPELINE_RESOLVER_HANDLER
  );

  return new Asset(scope, 'default_js_resolver_handler_asset', {
    path: resolveEntryPath(resolvedTemplatePath),
  });
};