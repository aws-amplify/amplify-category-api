import { GenerationDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveWrapper,
  TransformerPluginBase,
  generateGetArgumentsInput,
  TransformerResolver,
  APPSYNC_JS_RUNTIME,
} from '@aws-amplify/graphql-transformer-core';
import {
  MappingTemplateProvider,
  TransformerContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { HttpResourceIDs, ResolverResourceIDs } from 'graphql-transformer-common';
import { ToolConfig, createResponseTypeTool } from './utils/tools';
import * as cdk from 'aws-cdk-lib';
import { createInvokeBedrockResolverFunction } from './resolvers/invoke-bedrock';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { validate } from './validation';
import { toUpper } from 'graphql-transformer-common';

export type GenerationDirectiveConfiguration = {
  parent: ObjectTypeDefinitionNode;
  directive: DirectiveNode;
  aiModel: string;
  field: FieldDefinitionNode;
  systemPrompt: string;
  inferenceConfiguration: InferenceConfiguration;
};

export type InferenceConfiguration = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
};

export type GenerationConfigurationWithToolConfig = GenerationDirectiveConfiguration & {
  toolConfig: ToolConfig;
};

export class GenerationTransformer extends TransformerPluginBase {
  private directives: GenerationDirectiveConfiguration[] = [];

  private static readonly KNOWN_PROVIDERS = new Set([
    'amazon',
    'anthropic',
    'cohere',
    'deepseek',
    'meta',
    'mistral',
    'stability',
    'twelvelabs',
    'writer',
  ]);

  private static readonly INFERENCE_PROFILE_PREFIXES = new Set(['global', 'us', 'eu', 'apac', 'au', 'ca', 'jp', 'us-gov']);

  constructor() {
    super('amplify-generation-transformer', GenerationDirective.definition);
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveWrapped = new DirectiveWrapper(directive);
    const config = directiveWrapped.getArguments(
      {
        parent,
        directive,
        field: definition,
        inferenceConfiguration: {},
      } as GenerationDirectiveConfiguration,
      generateGetArgumentsInput(context.transformParameters),
    );

    validate(config, context as TransformerContextProvider);
    this.directives.push(config);
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    if (this.directives.length === 0) return;

    this.directives.forEach((directive) => {
      const { parent, field } = directive;
      const fieldName = field.name.value;
      const parentName = parent.name.value;

      const directiveWithToolConfig: GenerationConfigurationWithToolConfig = {
        ...directive,
        toolConfig: createResponseTypeTool(field, ctx),
      };

      const stackName = this.bedrockDataSourceName(fieldName) + 'Stack';
      const stack = this.createStack(ctx, stackName);

      const resolverResourceId = ResolverResourceIDs.ResolverResourceID(parentName, fieldName);
      const httpDataSourceId = HttpResourceIDs.HttpDataSourceID(this.bedrockDataSourceName(fieldName));
      const dataSource = this.createBedrockDataSource(ctx, directive, stack.region, stackName, httpDataSourceId);
      const invokeBedrockFunction = createInvokeBedrockResolverFunction(directiveWithToolConfig);

      this.createPipelineResolver(ctx, parentName, fieldName, resolverResourceId, invokeBedrockFunction, dataSource);
    });
  };

  /**
   * Creates a new CDK stack for the Generation transformer.
   * @param {TransformerContextProvider} ctx - The transformer context provider.
   * @param {string} stackName - The name of the stack to create.
   * @returns {cdk.Stack} The created CDK stack.
   */
  private createStack(ctx: TransformerContextProvider, stackName: string): cdk.Stack {
    const stack = ctx.stackManager.createStack(stackName);
    stack.templateOptions.templateFormatVersion = '2010-09-09';
    stack.templateOptions.description = 'An auto-generated nested stack for the @generation directive.';
    return stack;
  }

  /**
   * Creates a pipeline resolver for the Generation transformer.
   * @param {TransformerContextProvider} ctx - The transformer context provider.
   * @param {string} parentName - The name of the parent type.
   * @param {string} fieldName - The name of the field.
   * @param {string} resolverResourceId - The ID for the resolver resource.
   * @param {MappingTemplateProvider} invokeBedrockFunction - The invoke Bedrock function.
   */
  private createPipelineResolver(
    ctx: TransformerContextProvider,
    parentName: string,
    fieldName: string,
    resolverResourceId: string,
    invokeBedrockFunction: MappingTemplateProvider,
    dataSource: cdk.aws_appsync.HttpDataSource,
  ): void {
    const conversationPipelineResolver = new TransformerResolver(
      parentName,
      fieldName,
      resolverResourceId,
      { codeMappingTemplate: invokeBedrockFunction },
      ['auth'],
      [],
      dataSource as any,
      APPSYNC_JS_RUNTIME,
    );

    ctx.resolvers.addResolver(parentName, fieldName, conversationPipelineResolver);
  }

  /**
   * Creates a Bedrock data source for the Generation transformer.
   * @param {TransformerContextProvider} ctx - The transformer context provider.
   * @param {GenerationDirectiveConfiguration} directive - The directive configuration.
   * @param {string} region - The AWS region for the Bedrock service.
   * @param {string} stackName - The name of the stack.
   * @param {string} httpDataSourceId - The ID for the HTTP data source.
   * @returns {MappingTemplateProvider} The created Bedrock data source.
   */
  private createBedrockDataSource(
    ctx: TransformerContextProvider,
    directive: GenerationDirectiveConfiguration,
    region: string,
    stackName: string,
    httpDataSourceId: string,
  ): cdk.aws_appsync.HttpDataSource {
    const {
      field: {
        name: { value: fieldName },
      },
      aiModel,
    } = directive;

    const bedrockUrl = `https://bedrock-runtime.${region}.amazonaws.com`;

    const dataSourceScope = ctx.stackManager.getScopeFor(httpDataSourceId, stackName);
    const dataSource = ctx.api.host.addHttpDataSource(
      httpDataSourceId,
      bedrockUrl,
      {
        authorizationConfig: {
          signingRegion: region,
          signingServiceName: 'bedrock',
        },
      },
      dataSourceScope,
    );

    // This follows the existing pattern of generating logical IDs and names for IAM roles.
    const roleLogicalId = this.bedrockDataSourceName(fieldName) + 'IAMRole';
    const roleName = ctx.resourceHelper.generateIAMRoleName(roleLogicalId);
    const role = this.createBedrockDataSourceRole(dataSourceScope, roleLogicalId, roleName, region, aiModel);
    dataSource.ds.serviceRoleArn = role.roleArn;
    return dataSource;
  }

  /**
   * Checks if the given model ID is an inference profile (prefixed with a known region/global prefix).
   * @param {string} modelId - The Bedrock model ID.
   * @returns {boolean} True if the model ID is an inference profile.
   */
  private static isInferenceProfile(modelId: string): boolean {
    const firstSegment = modelId.split('.')[0];
    return GenerationTransformer.INFERENCE_PROFILE_PREFIXES.has(firstSegment);
  }

  /**
   * Checks if the given model ID is a global inference profile.
   * @param {string} modelId - The Bedrock model ID.
   * @returns {boolean} True if the model ID is a global inference profile.
   */
  private static isGlobalInferenceProfile(modelId: string): boolean {
    return modelId.startsWith('global.');
  }

  /**
   * Extracts the foundation model ID from an inference profile ID by finding the first known provider segment.
   * Falls back to stripping the first segment if no known provider is found.
   * @param {string} inferenceProfileId - The inference profile ID.
   * @returns {string} The extracted foundation model ID.
   */
  private static extractFoundationModelId(inferenceProfileId: string): string {
    const segments = inferenceProfileId.split('.');
    const providerIndex = segments.findIndex((segment) => GenerationTransformer.KNOWN_PROVIDERS.has(segment));
    if (providerIndex !== -1) {
      return segments.slice(providerIndex).join('.');
    }
    // Fallback: strip first segment
    return segments.slice(1).join('.');
  }

  /**
   * Creates an IAM role for the Bedrock service.
   * @param {Construct} dataSourceScope - The construct scope for the IAM role.
   * @param {string} roleLogicalId - The logical ID for the IAM role.
   * @param {string} roleName - The name of the IAM role.
   * @param {string} region - The AWS region for the Bedrock service.
   * @param {string} bedrockModelId - The ID for the Bedrock model.
   * @returns {iam.Role} The created IAM role.
   */
  private createBedrockDataSourceRole(
    dataSourceScope: Construct,
    roleLogicalId: string,
    roleName: string,
    region: string,
    bedrockModelId: string,
  ): cdk.aws_iam.Role {
    const partition = cdk.Stack.of(dataSourceScope).partition;
    const statements: iam.PolicyStatement[] = [];

    if (GenerationTransformer.isInferenceProfile(bedrockModelId)) {
      const account = cdk.Stack.of(dataSourceScope).account;
      const foundationModelId = GenerationTransformer.extractFoundationModelId(bedrockModelId);

      // Statement 1: inference-profile ARN (with account)
      statements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['bedrock:InvokeModel'],
          resources: [`arn:${partition}:bedrock:${region}:${account}:inference-profile/${bedrockModelId}`],
        }),
      );

      // Statement 2: regional foundation-model ARN
      statements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['bedrock:InvokeModel'],
          resources: [`arn:${partition}:bedrock:${region}::foundation-model/${foundationModelId}`],
        }),
      );

      // Statement 3 (global only): global foundation-model ARN (no region)
      if (GenerationTransformer.isGlobalInferenceProfile(bedrockModelId)) {
        statements.push(
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['bedrock:InvokeModel'],
            resources: [`arn:${partition}:bedrock:::foundation-model/${foundationModelId}`],
          }),
        );
      }

      cdk.Annotations.of(dataSourceScope).addWarning(
        `The model ID "${bedrockModelId}" appears to be an inference profile. ` +
          'IAM policies have been configured to allow access to both the inference profile and the underlying foundation model.',
      );
    } else {
      // Foundation model: single statement (existing behavior)
      statements.push(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['bedrock:InvokeModel'],
          resources: [`arn:${partition}:bedrock:${region}::foundation-model/${bedrockModelId}`],
        }),
      );
    }

    return new iam.Role(dataSourceScope, roleLogicalId, {
      roleName,
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
      inlinePolicies: {
        BedrockRuntimeAccess: new iam.PolicyDocument({
          statements,
        }),
      },
    });
  }

  private bedrockDataSourceName(fieldName: string): string {
    return `GenerationBedrockDataSource${toUpper(fieldName)}`;
  }
}
