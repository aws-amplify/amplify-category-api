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
import {
  convertAuthorizationModesToTransformerAuthConfig,
  getAuthParameters,
  rewriteAssets,
  preprocessGraphQLSchema,
  generateConstructExports,
  persistStackAssets,
} from './internal';
import type { AuthorizationMode, AmplifyGraphQlApiResources } from './types';
import { TransformerPluginProvider } from '../../amplify-graphql-transformer-interfaces';
import { NoopFeatureFlagProvider } from './internal/NoopFeatureFlagProvider';

export type AmplifyApiCompatibilityLayer = {
  stackMappings?: Record<string, string>;
  slotOverrides?: Record<string, string>;
  customTransformers?: TransformerPluginProvider[];
  predictionsBucket?: s3.IBucket;
};

export type AmplifyGraphQlApiProps = {
  schema: appsync.SchemaFile | string;
  envOverride?: string;
  apiName: string;
  authorizationModes?: AuthorizationMode[];
  resolverConfig?: ResolverConfig;
  _compat?: AmplifyApiCompatibilityLayer;
};

export class AmplifyGraphQlApi extends Construct {
  public readonly resources: AmplifyGraphQlApiResources;
  public readonly env: string;

  constructor(scope: Construct, id: string, props: AmplifyGraphQlApiProps) {
    super(scope, id);

    const {
      schema: modelSchema,
      authorizationModes,
      envOverride,
      _compat,
      resolverConfig,
    } = props;

    const assetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transformer'));

    const preprocessedSchema = preprocessGraphQLSchema(modelSchema);
    const { authConfig, identityPoolId, adminRoles } = convertAuthorizationModesToTransformerAuthConfig(authorizationModes);

    const {
      rootStack, stacks, resolvers, schema, functions,
    } = executeTransform({
      schema: preprocessedSchema,
      // resolvers: _compat?.slotOverrides ?? {},
      userDefinedSlots: {}, // TODO: Figure this out.
      stacks: {},
      transformersFactoryArgs: {
        authConfig,
        identityPoolId,
        adminRoles,
        customTransformers: _compat?.customTransformers ?? [],
        ...(_compat?.predictionsBucket ? { predictionsConfig: { bucketName: _compat.predictionsBucket.bucketName } } : {}),
      },
      authConfig,
      stackMapping: _compat?.stackMappings ?? {},
      resolverConfig,
      featureFlags: new NoopFeatureFlagProvider(), // TODO: Figure this out.
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
        AppSyncApiName: props.apiName,
        env: this.env,
        S3DeploymentBucket: cdk.DefaultStackSynthesizer.DEFAULT_FILE_ASSETS_BUCKET_NAME,
        S3DeploymentRootKey: cdk.DefaultStackSynthesizer.DEFAULT_FILE_ASSET_KEY_ARN_EXPORT_NAME,
        ...getAuthParameters(authorizationModes),
      },
      preserveLogicalIds: true,
    });

    this.resources = generateConstructExports(rootStack, stacks, transformerStack);
  }
}
