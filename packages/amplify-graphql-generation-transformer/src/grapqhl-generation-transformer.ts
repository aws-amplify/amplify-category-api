import { GenerationDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveWrapper,
  InvalidDirectiveError,
  TransformerPluginBase,
  generateGetArgumentsInput,
  TransformerResolver,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPrepareStepContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DirectiveNode, FieldDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { HttpResourceIDs, ResolverResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import { getBedrockModelId } from './utils/bedrock-model-id';
import { ToolConfig, createResponseTypeTool } from './utils/tools';
import * as cdk from 'aws-cdk-lib';
import { invokeBedrockResolver } from './resolvers/invoke-bedrock';
import * as iam from 'aws-cdk-lib/aws-iam';

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
  inferenceConfiguration: InferenceConfiguration;
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

    const toolConfig = createResponseTypeTool(definition, context as TransformerContextProvider);
    if (toolConfig) {
      config.toolConfig = toolConfig;
    }

    validate(config, context as TransformerContextProvider);
    this.directives.push(config);
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    const stackName = 'GenerationBedrockDataSourceStack';
    const stack: cdk.Stack = ctx.stackManager.createStack(stackName);
    // TODO: is this the current / right format version?
    stack.templateOptions.templateFormatVersion = '2010-09-09';
    stack.templateOptions.description = 'An auto-generated nested stack for the @generation directive.';
    const env = ctx.synthParameters.amplifyEnvironmentName;
    new cdk.CfnCondition(stack, ResourceConstants.CONDITIONS.HasEnvironmentParameter, {
      expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(env, ResourceConstants.NONE)),
    });
    const createdResources = new Map<string, any>();

    for (const directive of this.directives) {
      const {
        parent: {
          name: { value: parentName },
        },
        field: {
          name: { value: fieldName },
        },
      } = directive;

      const resolverResourceId = ResolverResourceIDs.ResolverResourceID(parentName, fieldName);
      const httpDataSourceId = HttpResourceIDs.HttpDataSourceID(`GenerationBedrockDataSource-${fieldName}`);

      if (!createdResources.has(httpDataSourceId)) {
        const dataSource = createBedrockDataSource(ctx, directive, stack.region, stackName, httpDataSourceId);
        createdResources.set(httpDataSourceId, dataSource);
      }

      const dataSource = createdResources.get(httpDataSourceId);
      const invokeBedrockFunction = invokeBedrockResolver(directive);
      // pipeline resolver
      const conversationPipelineResolver = new TransformerResolver(
        parentName,
        fieldName,
        resolverResourceId,
        invokeBedrockFunction.req,
        invokeBedrockFunction.res,
        ['init', 'preAuth', 'auth', 'postAuth', 'preDataLoad'],
        ['postDataLoad', 'finish'],
        dataSource as any,
        { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' },
      );

      ctx.resolvers.addResolver(parentName, fieldName, conversationPipelineResolver);
    }
  };

  prepare = (ctx: TransformerPrepareStepContextProvider): void => {
    // TODO: Do we have to do something for auth here or is it automagically handled by the transformer?
  };
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
  const { maxTokens, temperature, topP } = config.inferenceConfiguration;

  // dealing with possible 0 values, so we check for undefined.
  if (maxTokens !== undefined && maxTokens < 1) {
    throw new InvalidDirectiveError(`@generation directive maxTokens valid range: Minimum value of 1. Provided: ${maxTokens}`);
  }

  if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
    throw new InvalidDirectiveError(`@generation directive temperature valid range: Minimum value of 0. Maximum value of 1. Provided: ${temperature}`);
  }

  if (topP !== undefined && (topP < 0 || topP > 1)) {
    throw new InvalidDirectiveError(`@generation directive topP valid range: Minimum value of 0. Maximum value of 1. Provided: ${topP}`);
  }
}

const createBedrockDataSource = (
  ctx: TransformerContextProvider,
  directive: GenerationDirectiveConfiguration,
  region: string,
  stackName: string,
  httpDataSourceId: string,
): cdk.aws_appsync.HttpDataSource => {
  const {
    field: {
      name: { value: fieldName },
    },
  } = directive;

  const bedrockUrl = `https://bedrock-runtime.${region}.amazonaws.com`;
  const bedrockModelId = getBedrockModelId(directive.aiModel);

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

  const role = new iam.Role(dataSourceScope, `GenerationBedrockDataSourceRole${fieldName}`, {
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

  dataSource.ds.serviceRoleArn = role.roleArn;
  return dataSource;
};
