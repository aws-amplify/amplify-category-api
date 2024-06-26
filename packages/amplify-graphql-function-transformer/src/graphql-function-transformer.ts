import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  InvalidDirectiveError,
  isObjectTypeDefinitionNode,
  MappingTemplate,
  TransformerPluginBase,
} from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider, TransformerSchemaVisitStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { FunctionDirective } from '@aws-amplify/graphql-directives';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { AuthorizationType } from 'aws-cdk-lib/aws-appsync';
import * as cdk from 'aws-cdk-lib';
import { obj, str, ref, printBlock, compoundExpression, qref, raw, iff, Expression, set, bool } from 'graphql-mapping-template';
import { FunctionResourceIDs, ResolverResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import {
  DirectiveNode,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  FieldDefinitionNode,
  Kind,
  DocumentNode,
  TypeNode,
} from 'graphql';

type FunctionDirectiveConfiguration = {
  name: string;
  region: string | undefined;
  accountId: string | undefined;
  invocationType: string;
  resolverTypeName: string;
  resolverFieldName: string;
};

const FUNCTION_DIRECTIVE_STACK = 'FunctionDirectiveStack';

export class FunctionTransformer extends TransformerPluginBase {
  private resolverGroups: Map<FieldDefinitionNode, FunctionDirectiveConfiguration[]> = new Map();

  constructor(private readonly functionNameMap?: Record<string, lambda.IFunction>) {
    super('amplify-function-transformer', FunctionDirective.definition);
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    acc: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveWrapped = new DirectiveWrapper(directive);
    const args = directiveWrapped.getArguments(
      {
        resolverTypeName: parent.name.value,
        resolverFieldName: definition.name.value,
        invocationType: FunctionDirective.defaults.invocationType,
      } as FunctionDirectiveConfiguration,
      generateGetArgumentsInput(acc.transformParameters),
    );

    validate(args, definition, acc as TransformerContextProvider);
    let resolver = this.resolverGroups.get(definition);

    if (resolver === undefined) {
      resolver = [];
      this.resolverGroups.set(definition, resolver);
    }

    resolver.push(args);
  };

  generateResolvers = (context: TransformerContextProvider): void => {
    if (this.resolverGroups.size === 0) {
      return;
    }

    const stack: cdk.Stack = context.stackManager.createStack(FUNCTION_DIRECTIVE_STACK);
    const createdResources = new Map<string, any>();
    const env = context.synthParameters.amplifyEnvironmentName;

    stack.templateOptions.templateFormatVersion = '2010-09-09';
    stack.templateOptions.description = 'An auto-generated nested stack for the @function directive.';

    new cdk.CfnCondition(stack, ResourceConstants.CONDITIONS.HasEnvironmentParameter, {
      expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(env, ResourceConstants.NONE)),
    });

    this.resolverGroups.forEach((resolverFns) => {
      resolverFns.forEach((config) => {
        // Create data sources that register Lambdas and IAM roles.
        const dataSourceId = FunctionResourceIDs.FunctionDataSourceID(config.name, config.region, config.accountId);

        if (!createdResources.has(dataSourceId)) {
          const referencedFunction: lambda.IFunction =
            this.functionNameMap && config.name in this.functionNameMap
              ? this.functionNameMap[config.name]
              : lambda.Function.fromFunctionAttributes(stack, `${dataSourceId}Function`, {
                  functionArn: lambdaArnResource(env, config.name, config.region, config.accountId),
                });
          const dataSourceScope = context.stackManager.getScopeFor(dataSourceId, FUNCTION_DIRECTIVE_STACK);
          const dataSource = context.api.host.addLambdaDataSource(dataSourceId, referencedFunction, {}, dataSourceScope);
          createdResources.set(dataSourceId, dataSource);
        }

        // Create AppSync functions.
        const functionId = FunctionResourceIDs.FunctionAppSyncFunctionConfigurationID(config.name, config.region, config.accountId);
        let func = createdResources.get(functionId);

        if (func === undefined) {
          const funcScope = context.stackManager.getScopeFor(functionId, FUNCTION_DIRECTIVE_STACK);
          func = context.api.host.addAppSyncFunction(
            functionId,
            MappingTemplate.s3MappingTemplateFromString(
              printBlock(`Invoke AWS Lambda data source: ${dataSourceId}`)(
                obj({
                  version: str('2018-05-29'),
                  operation: str('Invoke'),
                  payload: obj({
                    typeName: ref('util.toJson($ctx.stash.get("typeName"))'),
                    fieldName: ref('util.toJson($ctx.stash.get("fieldName"))'),
                    arguments: ref('util.toJson($ctx.arguments)'),
                    identity: ref('util.toJson($ctx.identity)'),
                    source: ref('util.toJson($ctx.source)'),
                    request: ref('util.toJson($ctx.request)'),
                    prev: ref('util.toJson($ctx.prev)'),
                  }),
                  invocationType: str(config.invocationType),
                }),
              ),
              `${functionId}.req.vtl`,
            ),
            MappingTemplate.s3MappingTemplateFromString(responseMappingTemplate(config), `${functionId}.res.vtl`),
            dataSourceId,
            funcScope,
          );

          createdResources.set(functionId, func);
        }

        // Create the GraphQL resolvers.
        const resolverId = ResolverResourceIDs.ResolverResourceID(config.resolverTypeName, config.resolverFieldName);
        let resolver = createdResources.get(resolverId);

        const requestTemplate: Array<Expression> = [
          qref(`$ctx.stash.put("typeName", "${config.resolverTypeName}")`),
          qref(`$ctx.stash.put("fieldName", "${config.resolverFieldName}")`),
        ];
        const authModes = [context.authConfig.defaultAuthentication, ...(context.authConfig.additionalAuthenticationProviders || [])].map(
          (mode) => mode?.authenticationType,
        );
        if (authModes.includes(AuthorizationType.IAM)) {
          const authRole = context.synthParameters.authenticatedUserRoleName;
          const unauthRole = context.synthParameters.unauthenticatedUserRoleName;
          const account = cdk.Stack.of(context.stackManager.scope).account;
          requestTemplate.push(
            qref(`$ctx.stash.put("authRole", "arn:aws:sts::${account}:assumed-role/${authRole}/CognitoIdentityCredentials")`),
            qref(`$ctx.stash.put("unauthRole", "arn:aws:sts::${account}:assumed-role/${unauthRole}/CognitoIdentityCredentials")`),
          );

          const identityPoolId = context.synthParameters.identityPoolId;
          if (identityPoolId) {
            requestTemplate.push(qref(`$ctx.stash.put("identityPoolId", "${identityPoolId}")`));
          }
          const adminRoles = context.synthParameters.adminRoles ?? [];
          requestTemplate.push(qref(`$ctx.stash.put("adminRoles", ${JSON.stringify(adminRoles)})`));
        }
        requestTemplate.push(obj({}));

        if (resolver === undefined) {
          // TODO: update function to use resolver manager.
          const resolverScope = context.stackManager.getScopeFor(resolverId, FUNCTION_DIRECTIVE_STACK);
          resolver = context.api.host.addResolver(
            config.resolverTypeName,
            config.resolverFieldName,
            MappingTemplate.inlineTemplateFromString(printBlock('Stash resolver specific context.')(compoundExpression(requestTemplate))),
            MappingTemplate.s3MappingTemplateFromString(
              '$util.toJson($ctx.prev.result)',
              `${config.resolverTypeName}.${config.resolverFieldName}.res.vtl`,
            ),
            resolverId,
            undefined,
            [],
            resolverScope,
          );
          createdResources.set(resolverId, resolver);
        }

        resolver.pipelineConfig.functions.push(func.functionId);
      });
    });
  };
}

/**
 * The response mapping template for 'RequestResponse' (default) and 'Event' invocation types differ.
 * Use this to generate the appropriate response mapping template.
 * @param config the {@link FunctionDirectiveConfiguration} for `@function` definition.
 * @returns the response mapping template used by AppSync to handle responses from the Lambda function invocation.
 */
const responseMappingTemplate = (config: FunctionDirectiveConfiguration): string => {
  if (config.invocationType === 'Event') {
    /*
      #set( $success = true )
      #if( $ctx.error )
        $util.error($ctx.error.message, $ctx.error.type)
        #set( $success = false )
      #end
      #set( $response = {
        "success": $success
      } )
      $util.toJson($response)
    */
    return printBlock('Handle error or return result')(
      compoundExpression([
        set(ref('success'), bool(true)),
        iff(
          ref('ctx.error'),
          compoundExpression([raw('$util.error($ctx.error.message, $ctx.error.type)'), set(ref('success'), bool(false))]),
        ),
        compoundExpression([set(ref('response'), obj({ success: ref('success') })), raw('$util.toJson($response)')]),
      ]),
    );
  }

  /*
    #if( $ctx.error )
      $util.error($ctx.error.message, $ctx.error.type)
    #end
    $util.toJson($ctx.result)
  */
  return printBlock('Handle error or return result')(
    compoundExpression([
      iff(ref('ctx.error'), compoundExpression([raw('$util.error($ctx.error.message, $ctx.error.type)')])),
      raw('$util.toJson($ctx.result)'),
    ]),
  );
};

const lambdaArnResource = (env: string, name: string, region?: string, accountId?: string): string => {
  const substitutions: { [key: string]: string } = {};
  // eslint-disable-next-line no-template-curly-in-string
  if (name.includes('${env}')) {
    substitutions.env = env;
  }
  return cdk.Fn.conditionIf(
    ResourceConstants.CONDITIONS.HasEnvironmentParameter,
    cdk.Fn.sub(lambdaArnKey(name, region, accountId), substitutions),
    cdk.Fn.sub(lambdaArnKey(name.replace(/(-\${env})/, ''), region, accountId)),
  ).toString();
};

const lambdaArnKey = (name: string, region?: string, accountId?: string): string => {
  // eslint-disable-next-line no-template-curly-in-string
  return `arn:aws:lambda:${region ? region : '${AWS::Region}'}:${accountId ? accountId : '${AWS::AccountId}'}:function:${name}`;
};

// #region Validation

/**
 * Validates that a `@function` directive is used in a supported way.
 * @param config the {@link FunctionDirectiveConfiguration} to validate.
 * @param definition the {@link FieldDefinitionNode} on which the `@function` directive is used.
 * @param ctx the {@link TransformerContextProvider}
 */
const validate = (config: FunctionDirectiveConfiguration, definition: FieldDefinitionNode, ctx: TransformerContextProvider): void => {
  if (config.invocationType === 'Event') {
    // For 'invocationType: Event' validate:
    // 1. is used on field where parent type is Mutation or Query.
    validateIsSupportedEventInvocationParentType(config);
    // 2. return type of query / mutation is 'EventInvocationResponse'.
    validateFieldResponseTypeForEventInvocation(definition, config);
    // 3. shape of 'EventInvocationResponse' type defined in schema.
    validateSchemaDefinedEventInvocationResponseShape(ctx.inputDocument);
  }
};

// #region Validation helpers

/**
 * Used for consistent validation and error messaging.
 */
const eventInvocationResponse = {
  typeName: 'EventInvocationResponse',
  shapeDescription: 'type EventInvocationResponse { success: Boolean! }',
};

/**
 * Validates that a query / mutation using `@function(..., invocationType: Event)` has the expected return type.
 * - The return type's kind is 'NamedType'
 * - The return type's name is 'EventInvocationResponse'
 *
 * @param fieldDefition the query / mutation that the @function(..., invocationType: Event) is defined on.
 */
const validateFieldResponseTypeForEventInvocation = (fieldDefition: FieldDefinitionNode, config: FunctionDirectiveConfiguration): void => {
  const { type } = fieldDefition;
  const fieldResponseTypeHasValidName = type.kind === Kind.NAMED_TYPE && type.name.value === eventInvocationResponse.typeName;

  if (!fieldResponseTypeHasValidName) {
    // This happens when an event invocation type is defined on a field (query / mutation) where the
    // return type is not named 'EventInvocationResponse'.
    // For example:
    // type Mutation {
    //   doStuff(msg: String): String @function(name: 'foo', invocationType: Event)
    // }

    const errorMessage =
      `Invalid return type ${typeDescription(type)} for ${fieldDescription(config, fieldDefition)}.\n` +
      `Use return type '${eventInvocationResponse.typeName}' and, if necessary, add '${eventInvocationResponse.shapeDescription}' to your model schema.`;
    throw new InvalidDirectiveError(errorMessage);
  }
};

/**
 * Validate that an 'EventInvocationResponse' type is defined in the provided model schema and
 * has the expected shape:
 *
 *  type EventInvocationResponse {
 *    success: Boolean!
 *  }
 *
 * @param inputDocument the {@link DocumentNode} representing the model schema definition.
 * This should come from `ctx.inputDocument` where ctx is {@link TransformerContextProvider}
 */
const validateSchemaDefinedEventInvocationResponseShape = (inputDocument: DocumentNode): void => {
  // validate shape { success: Boolean! }
  // We've already validated that the response type of the query / mutation
  const responseTypeDefinitionNode = inputDocument.definitions.find(
    (definitionNode) => isObjectTypeDefinitionNode(definitionNode) && definitionNode.name.value === eventInvocationResponse.typeName,
  ) as ObjectTypeDefinitionNode | undefined;

  if (!responseTypeDefinitionNode) {
    // This implies an invalid GraphQL schema due to a defined return type ('EventInvocationResponse')
    // being undefined in the Model Schema -- upstream validation should have already thrown a
    // 'Schema validation failed. Unkown type "EventInvocationResponse"' error.
    // We're doing this check here because upstream conditions can change in the future.
    const errorMessage =
      `Missing '${eventInvocationResponse.typeName}' definition. Add this type definition to your schema:\n` +
      eventInvocationResponse.shapeDescription;
    throw new InvalidDirectiveError(errorMessage);
  }

  const errorMessage =
    `Invalid '${eventInvocationResponse.typeName}' definition. Update the type definition in your schema to:\n` +
    `${eventInvocationResponse.shapeDescription}`;

  // 'EventInvocationResponse' should contain only one field -- success: Boolean!
  // We're doing this to:
  // 1. safely access the first element below.
  // 2. throw if > 1 fields are defined on the type.
  const containsOneField = responseTypeDefinitionNode.fields?.length === 1;
  if (!containsOneField) {
    throw new InvalidDirectiveError(errorMessage);
  }

  const [expectedField] = responseTypeDefinitionNode.fields;

  // At this point, we know there's only one field on the 'EventInvocationResponse' defined in the schema.
  // Now we validate that this field has the shape 'success: Boolean!'
  const schemaDefinedTypeHasValidShape =
    expectedField.name.value === 'success' &&
    expectedField.type.kind === Kind.NON_NULL_TYPE &&
    expectedField.type.type.kind === Kind.NAMED_TYPE &&
    expectedField.type.type.name.value === 'Boolean';

  if (!schemaDefinedTypeHasValidShape) {
    throw new InvalidDirectiveError(errorMessage);
  }
};

/**
 * Validates that the parent type is valid for 'invocationType: Event'
 * - parent type === 'Query' | 'Mutation'
 * This is done to ensure we don't accidentally add Event invocation type support to other types, e.g. `@model` or subscriptions.
 * @param config the {@link FunctionDirectiveConfiguration} for 'invocationType: Event' definitions.
 */
const validateIsSupportedEventInvocationParentType = (config: FunctionDirectiveConfiguration): void => {
  const isValidParentType = config.resolverTypeName === 'Query' || config.resolverTypeName === 'Mutation';

  if (!isValidParentType) {
    throw new InvalidDirectiveError("@function definition with 'invocationType: Event' must be defined on Query or Mutation field.");
  }
};
/**
 * Use this to generate a description of a type for contextual error messages.
 * @param typeNode the {@link TypeNode} to describe.
 * @returns a textual description of the {@link TypeNode} in `string` form.
 */
const typeDescription = (typeNode: TypeNode): string => {
  /*
  Int -- NamedType
  Int! -- NonNullType.NamedType -- '' / !
  [Int] -- ListType.NamedType -- [ / ]
  [Int]! -- NonNullType.ListType.NamedType -- '' / ! --> [ / ]!
  [Int!] -- ListType.NonNullType.NamedType -- [ / ] --> [ / !]
  [Int!]! -- NonNullType.ListType.NonNullType.NamedType -- '' / ! --> [ / ]! --> [ / !]!
  */
  // eslint-disable-next-line consistent-return
  const description = (node: TypeNode, prefix = '', suffix = ''): string => {
    switch (node.kind) {
      case Kind.LIST_TYPE:
        return description(node.type, prefix + '[', ']' + suffix);
      case Kind.NON_NULL_TYPE:
        return description(node.type, prefix, '!' + suffix);
      case Kind.NAMED_TYPE:
        return `${prefix}${node.name.value}${suffix}`;
    }
  };

  return description(typeNode);
};

/**
 * Use this to generate a field description for contextual error messages in the form of:
 * `field-name(optional-args): return-type `@function`(name: name, invocationType: invocation-type)`
 * @param config the {@link FunctionDirectiveConfiguration} of the `@function` directive.
 * @param field the {@link FieldDefinitionNode} on which the `@function` directive is defined.
 * @returns a description of the field with `@function` directive appropriate for use in error messages.
 */
const fieldDescription = (config: FunctionDirectiveConfiguration, field: FieldDefinitionNode): string => {
  const args = field.arguments?.map((arg) => `${arg.name.value}: ${typeDescription(arg.type)}`).join(', ') ?? '';
  return `${config.resolverFieldName}(${args}): ${typeDescription(field.type)} @${FunctionDirective.name}(name: ${
    config.name
  }, invocationType: ${config.invocationType})`;
};

// #endregion Validation helpers
// #endregion Validation
