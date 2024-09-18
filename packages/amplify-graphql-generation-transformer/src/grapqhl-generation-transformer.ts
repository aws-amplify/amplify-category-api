import { GenerationDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveWrapper,
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
    const mappingTemplate = {
      codeMappingTemplate: invokeBedrockFunction,
    };
    const conversationPipelineResolver = new TransformerResolver(
      parentName,
      fieldName,
      resolverResourceId,
      mappingTemplate,
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

    // This follows the existing pattern of generating logical IDs and names for IAM roles.
    const roleLogicalId = this.bedrockDataSourceName(fieldName) + 'IAMRole';
    const roleName = ctx.resourceHelper.generateIAMRoleName(roleLogicalId);
    const role = this.createBedrockDataSourceRole(dataSourceScope, roleLogicalId, roleName, region, aiModel);
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
    roleLogicalId: string,
    roleName: string,
    region: string,
    bedrockModelId: string,
  ): cdk.aws_iam.Role {
    return new iam.Role(dataSourceScope, roleLogicalId, {
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

  private bedrockDataSourceName(fieldName: string): string {
    return `GenerationBedrockDataSource${toUpper(fieldName)}`;
  }
}
