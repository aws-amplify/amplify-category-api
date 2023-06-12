import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as cfninclude from 'aws-cdk-lib/cloudformation-include';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { executeTransform } from '@aws-amplify/graphql-transformer';
import { ResolverConfig } from '@aws-amplify/graphql-transformer-core';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';
import {
  convertAuthorizationModesToTransformerAuthConfig,
  rewriteAssets,
  preprocessGraphQLSchema,
  generateConstructExports,
  persistStackAssets,
} from './internal';
import type { AuthorizationConfig, AmplifyGraphQlApiResources } from './types';
import { TransformerPluginProvider } from '../../amplify-graphql-transformer-interfaces';
import { parseUserDefinedSlots } from './internal/user-defined-slots';

export type AmplifyGraphQlApiProps = {
  schema: appsync.SchemaFile | string;
  envOverride?: string;
  apiName?: string;
  authorizationConfig: AuthorizationConfig;
  resolverConfig?: ResolverConfig;
  stackMappings?: Record<string, string>;
  slotOverrides?: Record<string, string>;
  customTransformers?: TransformerPluginProvider[];
  predictionsBucket?: s3.IBucket;
  transformParameters?: Partial<TransformParameters>
};

export class AmplifyGraphQlApi extends Construct {
  public readonly resources: AmplifyGraphQlApiResources;
  public readonly env: string;

  constructor(scope: Construct, id: string, props: AmplifyGraphQlApiProps) {
    super(scope, id);

    const {
      schema: modelSchema,
      authorizationConfig,
      envOverride,
      resolverConfig,
      slotOverrides,
      customTransformers,
      predictionsBucket,
      stackMappings,
      transformParameters,
    } = props;

    const assetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transformer'));

    const {
      authConfig,
      identityPoolId,
      adminRoles,
      cfnIncludeParameters: authCfnIncludeParameters,
    } = convertAuthorizationModesToTransformerAuthConfig(authorizationConfig);

    const {
      rootStack, stacks, resolvers, schema, functions,
    } = executeTransform({
      schema: preprocessGraphQLSchema(modelSchema),
      userDefinedSlots: slotOverrides ? parseUserDefinedSlots(slotOverrides) : {},
      stacks: {},
      transformersFactoryArgs: {
        authConfig,
        identityPoolId,
        adminRoles,
        customTransformers: customTransformers ?? [],
        ...(predictionsBucket ? { predictionsConfig: { bucketName: predictionsBucket.bucketName } } : {}),
      },
      authConfig,
      stackMapping: stackMappings ?? {},
      resolverConfig,
      transformParameters,
    });

    rewriteAssets(this, {
      assetDir,
      schema,
      resolvers,
      functions,
      rootStack,
      stacks,
    });

    const { rootTemplateFile, nestedStackConfig } = persistStackAssets({
      assetDir,
      rootStack,
      stacks,
    });

    // Allow env as an override prop, otherwise retrieve from context, and use value 'NONE' if no value can be found.
    // env is required for logical id suffixing, as well as Exports from the nested stacks.
    // Allow export so customers can reuse the env in their own references downstream.
    this.env = envOverride ?? this.node.tryGetContext('env') ?? 'NONE';
    if (this.env.length > 8) {
      throw new Error(`envOverride prop or cdk --context env must have a length <= 8, found ${this.env}`);
    }

    const transformerStack = new cfninclude.CfnInclude(this, 'RootStack', {
      templateFile: rootTemplateFile,
      loadNestedStacks: nestedStackConfig,
      parameters: {
        AppSyncApiName: props.apiName ?? id,
        env: this.env,
        S3DeploymentBucket: cdk.DefaultStackSynthesizer.DEFAULT_FILE_ASSETS_BUCKET_NAME,
        S3DeploymentRootKey: cdk.DefaultStackSynthesizer.DEFAULT_FILE_ASSET_KEY_ARN_EXPORT_NAME,
        ...authCfnIncludeParameters,
      },
      preserveLogicalIds: true,
    });

    this.resources = generateConstructExports(rootStack, stacks, transformerStack);
  }
}
