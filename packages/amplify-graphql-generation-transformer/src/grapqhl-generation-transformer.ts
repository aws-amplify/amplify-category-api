import { GenerationDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveWrapper,
  InvalidDirectiveError,
  TransformerPluginBase,
  generateGetArgumentsInput,
  TransformerResolver,
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
import { invokeBedrockResolver } from './resolvers/invoke-bedrock';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export type InferenceConfiguration = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
};

export type GenerationDirectiveConfiguration = {
  parent: ObjectTypeDefinitionNode;
  directive: DirectiveNode;
  aiModel: string;
  bedrockRegion: string;
  field: FieldDefinitionNode;
  systemPrompt: string;
  toolConfig: ToolConfig;
  inferenceConfiguration: InferenceConfiguration | undefined;
};

export class GenerationTransformer extends TransformerPluginBase {
  private directives: GenerationDirectiveConfiguration[] = [];

  constructor() {
    super('amplify-generation-transformer', GenerationDirective.definition);
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): void => {
    if (parent.name.value !== 'Query') {
      throw new InvalidDirectiveError('@generation directive must be used on Query field.');
    }

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

      directive.toolConfig = createResponseTypeTool(field, ctx);

      const stackName = `Generation${this.capitalizeFirstLetter(fieldName)}BedrockDataSourceStack`;
      const stack = this.createStack(ctx, stackName);

      const resolverResourceId = ResolverResourceIDs.ResolverResourceID(parentName, fieldName);
      const httpDataSourceId = HttpResourceIDs.HttpDataSourceID(`GenerationBedrockDataSource-${fieldName}`);
      const dataSource = this.createBedrockDataSource(ctx, directive, stack.region, stackName, httpDataSourceId);
      const invokeBedrockFunction = invokeBedrockResolver(directive);

      this.createPipelineResolver(ctx, parentName, fieldName, resolverResourceId, invokeBedrockFunction, dataSource);
    });
  };

  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

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
   * @param {string} parentName - The name of the parent resolver.
   * @param {string} fieldName - The name of the field.
   * @param {string} resolverResourceId - The ID for the resolver resource.
   * @param {MappingTemplateProvider} invokeBedrockFunction - The invoke Bedrock function.
   */
  private createPipelineResolver(
    ctx: TransformerContextProvider,
    parentName: string,
    fieldName: string,
    resolverResourceId: string,
    invokeBedrockFunction: { req: MappingTemplateProvider; res: MappingTemplateProvider },
    dataSource: cdk.aws_appsync.HttpDataSource,
  ): void {
    const conversationPipelineResolver = new TransformerResolver(
      parentName,
      fieldName,
      resolverResourceId,
      invokeBedrockFunction.req,
      invokeBedrockFunction.res,
      ['auth'],
      [],
      dataSource as any,
      { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' },
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

    const roleName = ctx.resourceHelper.generateIAMRoleName(`GenerationBedrockDataSourceRole${fieldName}`);
    const role = this.createBedrockDataSourceRole(dataSourceScope, fieldName, roleName, region, aiModel);
    dataSource.ds.serviceRoleArn = role.roleArn;
    return dataSource;
  }

  /**
   * Creates an IAM role for the Bedrock service.
   * @param {Construct} dataSourceScope - The construct scope for the IAM role.
   * @param {string} fieldName - The name of the field.
   * @param {string} roleName - The name of the IAM role.
   * @param {string} region - The AWS region for the Bedrock service.
   * @param {string} bedrockModelId - The ID for the Bedrock model.
   * @returns {iam.Role} The created IAM role.
   */
  private createBedrockDataSourceRole(
    dataSourceScope: Construct,
    fieldName: string,
    roleName: string,
    region: string,
    bedrockModelId: string,
  ): cdk.aws_iam.Role {
    return new iam.Role(dataSourceScope, `GenerationBedrockDataSourceRole${fieldName}`, {
      roleName,
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
      inlinePolicies: {
        BedrockRuntimeAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['bedrock:InvokeModel'],
              resources: [`arn:aws:bedrock:${region}::foundation-model/${bedrockModelId}`],
            }),
          ],
        }),
      },
    });
  }
}

const validate = (config: GenerationDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  validateInferenceConfig(config);
};

/**
 * Validates the inference configuration for the `@generation` directive according to the Bedrock API docs.
 * {@link https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InferenceConfiguration.html}
 * @param config The generation directive configuration to validate.
 */
const validateInferenceConfig = (config: GenerationDirectiveConfiguration): void => {
  if (!config.inferenceConfiguration) {
    return;
  }

  const { maxTokens, temperature, topP } = config.inferenceConfiguration;

  // dealing with possible 0 values, so we check for undefined.
  if (maxTokens !== undefined && maxTokens < 1) {
    throw new InvalidDirectiveError(`@generation directive maxTokens valid range: Minimum value of 1. Provided: ${maxTokens}`);
  }

  if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
    throw new InvalidDirectiveError(
      `@generation directive temperature valid range: Minimum value of 0. Maximum value of 1. Provided: ${temperature}`,
    );
  }

  if (topP !== undefined && (topP < 0 || topP > 1)) {
    throw new InvalidDirectiveError(`@generation directive topP valid range: Minimum value of 0. Maximum value of 1. Provided: ${topP}`);
  }
};
