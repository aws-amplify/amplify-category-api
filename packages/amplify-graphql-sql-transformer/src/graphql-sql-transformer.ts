import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  getResourceNamesForStrategy,
  InvalidDirectiveError,
  isSqlStrategy,
  MappingTemplate,
  TransformerPluginBase,
} from '@aws-amplify/graphql-transformer-core';
import { SqlDirective } from '@aws-amplify/graphql-directives';
import { TransformerContextProvider, TransformerSchemaVisitStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import * as cdk from 'aws-cdk-lib';
import {
  obj,
  str,
  ref,
  printBlock,
  compoundExpression,
  Expression,
  set,
  methodCall,
  ifElse,
  toJson,
  iff,
  notEquals,
  not,
  equals,
  ret,
  and,
} from 'graphql-mapping-template';
import { ResolverResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import { DirectiveNode, ObjectTypeDefinitionNode, InterfaceTypeDefinitionNode, FieldDefinitionNode } from 'graphql';

type SqlDirectiveConfiguration = {
  statement: string | undefined;
  reference: string | undefined;
  resolverTypeName: string;
  resolverFieldName: string;
};

const SQL_DIRECTIVE_STACK = 'CustomSQLStack';

export class SqlTransformer extends TransformerPluginBase {
  private sqlDirectiveFields: Map<FieldDefinitionNode, SqlDirectiveConfiguration[]> = new Map();

  constructor() {
    super('amplify-sql-transformer', SqlDirective.definition);
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    ctx: TransformerSchemaVisitStepContextProvider,
  ): void => {
    if (parent.name.value !== 'Query' && parent.name.value !== 'Mutation') {
      throw new InvalidDirectiveError(
        `@sql directive can only be used on Query or Mutation types. Check type "${parent.name.value}" and field "${definition.name.value}".`,
      );
    }

    const directiveWrapped = new DirectiveWrapper(directive);

    // This should never happen -- it will be picked up during schema validation
    if (
      !directive?.arguments?.find((arg) => arg.name.value === 'statement') &&
      !directive?.arguments?.find((arg) => arg.name.value === 'reference')
    ) {
      throw new InvalidDirectiveError(
        `@sql directive must have either a 'statement' or a 'reference' argument. Check type "${parent.name.value}" and field "${definition.name.value}".`,
      );
    }

    const args = directiveWrapped.getArguments(
      {
        resolverTypeName: parent.name.value,
        resolverFieldName: definition.name.value,
      } as SqlDirectiveConfiguration,
      generateGetArgumentsInput(ctx.transformParameters),
    );
    let resolver = this.sqlDirectiveFields.get(definition);

    if (resolver === undefined) {
      resolver = [];
      this.sqlDirectiveFields.set(definition, resolver);
    }

    resolver.push(args);
  };

  generateResolvers = (context: TransformerContextProvider): void => {
    if (this.sqlDirectiveFields.size === 0) {
      return;
    }

    const stack: cdk.Stack = context.stackManager.createStack(SQL_DIRECTIVE_STACK);
    const env = context.synthParameters.amplifyEnvironmentName;

    stack.templateOptions.templateFormatVersion = '2010-09-09';
    stack.templateOptions.description = 'An auto-generated nested stack for the @sql directive.';

    new cdk.CfnCondition(stack, ResourceConstants.CONDITIONS.HasEnvironmentParameter, {
      expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(env, ResourceConstants.NONE)),
    });

    this.sqlDirectiveFields.forEach((resolverFns) => {
      resolverFns.forEach((config) => {
        const typeName = config.resolverTypeName;
        const fieldName = config.resolverFieldName;
        const strategy = context.sqlDirectiveDataSourceStrategies?.find((css) => css.typeName === typeName && css.fieldName === fieldName);
        if (!strategy) {
          throw new Error(`Could not find custom SQL strategy for ${typeName}.${fieldName}`);
        }

        const resourceNames = getResourceNamesForStrategy(strategy.strategy);
        const dataSourceId = resourceNames.sqlLambdaDataSource;
        const dataSource = context.api.host.getDataSource(dataSourceId);

        const statement = getStatement(config, strategy.customSqlStatements);
        const resolverResourceId = ResolverResourceIDs.ResolverResourceID(config.resolverTypeName, config.resolverFieldName);
        const resolver = context.resolvers.generateQueryResolver(
          config.resolverTypeName,
          config.resolverFieldName,
          resolverResourceId,
          dataSource as any,
          MappingTemplate.s3MappingTemplateFromString(
            generateSqlLambdaRequestTemplate(statement, 'RAW_SQL', config.resolverFieldName),
            `${config.resolverTypeName}.${config.resolverFieldName}.req.vtl`,
          ),
          MappingTemplate.s3MappingTemplateFromString(
            generateSqlLambdaResponseMappingTemplate(),
            `${config.resolverTypeName}.${config.resolverFieldName}.res.vtl`,
          ),
        );

        resolver.addToSlot(
          'postAuth',
          MappingTemplate.s3MappingTemplateFromString(
            generateAuthExpressionForSandboxMode(context.transformParameters.sandboxModeEnabled, context.synthParameters.enableIamAccess),
            `${config.resolverTypeName}.${config.resolverFieldName}.{slotName}.{slotIndex}.req.vtl`,
          ),
        );
        resolver.setScope(context.stackManager.getScopeFor(resolverResourceId, SQL_DIRECTIVE_STACK));
        context.resolvers.addResolver(config.resolverTypeName, config.resolverFieldName, resolver);
      });
    });
  };
}

const generateAuthExpressionForSandboxMode = (isSandboxModeEnabled: boolean, genericIamAccessEnabled: boolean | undefined): string => {
  const API_KEY = 'API Key Authorization';
  const IAM_AUTH_TYPE = 'IAM Authorization';

  const expressions: Array<Expression> = [];
  if (isSandboxModeEnabled) {
    expressions.push(iff(equals(methodCall(ref('util.authType')), str(API_KEY)), ret(toJson(obj({})))));
  }
  if (genericIamAccessEnabled) {
    const isNonCognitoIAMPrincipal = and([
      equals(ref('util.authType()'), str(IAM_AUTH_TYPE)),
      methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityPoolId')),
      methodCall(ref('util.isNull'), ref('ctx.identity.cognitoIdentityId')),
    ]);
    expressions.push(iff(isNonCognitoIAMPrincipal, ret(toJson(obj({})))));
  }
  expressions.push(methodCall(ref('util.unauthorized')));

  return printBlock(`Sandbox Mode ${isSandboxModeEnabled ? 'Enabled' : 'Disabled'}`)(
    compoundExpression([iff(not(ref('ctx.stash.get("hasAuth")')), compoundExpression(expressions)), toJson(obj({}))]),
  );
};

const getStatementFromStatementAttribute = (config: SqlDirectiveConfiguration): string => {
  const statement = config.statement;
  if (statement === undefined || statement.trim().length === 0) {
    throw new InvalidDirectiveError(
      `@sql directive 'statement' argument must not be empty. Check type "${config.resolverTypeName}" and field "${config.resolverFieldName}".`,
    );
  }
  return statement;
};

const getStatementFromReferenceAttribute = (config: SqlDirectiveConfiguration, customQueries?: Record<string, string>): string => {
  if (!config.reference || !customQueries || !customQueries[config.reference]) {
    throw new InvalidDirectiveError(
      `The ${config.resolverTypeName} field "${config.resolverFieldName}" references a custom SQL statement "${config.reference}" that ` +
        `doesn't exist. Verify that "${config.reference}" is a key in the customSqlStatements property.`,
    );
  }
  return customQueries[config.reference];
};

const getStatement = (config: SqlDirectiveConfiguration, customQueries?: Record<string, string>): string => {
  if (config.reference && config.statement) {
    throw new InvalidDirectiveError(
      `@sql directive can have either a 'statement' or a 'reference' argument but not both. Check type "${config.resolverTypeName}" and field "${config.resolverFieldName}".`,
    );
  }

  if (typeof config.statement === 'string') {
    return getStatementFromStatementAttribute(config);
  }

  if (typeof config.reference === 'string') {
    return getStatementFromReferenceAttribute(config, customQueries);
  }

  // This should never happen -- it will be picked up during schema validation -- but we'll be defensive and ensure the type safety of the
  // function
  throw new InvalidDirectiveError(
    `@sql directive must have either a 'statement' or a 'reference' argument. Check type "${config.resolverTypeName}" and field "${config.resolverFieldName}".`,
  );
};

export const generateSqlLambdaRequestTemplate = (statement: string, operation: string, operationName: string): string => {
  return printBlock('Invoke RDS Lambda data source')(
    compoundExpression([
      set(ref('lambdaInput'), obj({})),
      set(ref('lambdaInput.parameters'), obj({})),
      set(ref('lambdaInput.statement'), str(statement)),
      set(ref('lambdaInput.operation'), str(operation)),
      set(ref('lambdaInput.operationName'), str(operationName)),
      set(ref('lambdaInput.parameters'), methodCall(ref('util.defaultIfNull'), ref('context.arguments'), obj({}))),
      obj({
        version: str('2018-05-29'),
        operation: str('Invoke'),
        payload: methodCall(ref('util.toJson'), ref('lambdaInput')),
      }),
    ]),
  );
};

export const generateSqlLambdaResponseMappingTemplate = (): string => {
  const statements: Expression[] = [];

  statements.push(
    ifElse(ref('ctx.error'), methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type')), toJson(ref('ctx.result'))),
  );

  return printBlock('ResponseTemplate')(compoundExpression(statements));
};
