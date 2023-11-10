import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  InvalidDirectiveError,
  MappingTemplate,
  TransformerPluginBase,
} from '@aws-amplify/graphql-transformer-core';
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
} from 'graphql-mapping-template';
import { getSqlResourceNameForStrategy, ResolverResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import { DirectiveNode, ObjectTypeDefinitionNode, InterfaceTypeDefinitionNode, FieldDefinitionNode } from 'graphql';

type SqlDirectiveConfiguration = {
  statement: string | undefined;
  reference: string | undefined;
  resolverTypeName: string;
  resolverFieldName: string;
};

const SQL_DIRECTIVE_STACK_PREFIX = 'CustomSQLStack';

const directiveDefinition = /* GraphQL */ `
  directive @sql(statement: String, reference: String) on FIELD_DEFINITION
`;

export class SqlTransformer extends TransformerPluginBase {
  private sqlDirectiveFields: Map<FieldDefinitionNode, SqlDirectiveConfiguration[]> = new Map();

  constructor() {
    super('amplify-sql-transformer', directiveDefinition);
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    ctx: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const parentName = parent.name.value;
    if (parentName !== 'Query' && parentName !== 'Mutation') {
      throw new InvalidDirectiveError(
        `@sql directive can only be used on Query or Mutation types. Check type "${parentName}" and field "${definition.name.value}".`,
      );
    }

    if (
      !directive?.arguments?.find((arg) => arg.name.value === 'statement') &&
      !directive?.arguments?.find((arg) => arg.name.value === 'reference')
    ) {
      throw new InvalidDirectiveError(
        `@sql directive must have either a 'statement' or 'reference' argument. Check type "${parentName}" and field "${definition.name.value}".`,
      );
    }

    const directiveWrapped = new DirectiveWrapper(directive);
    const args = directiveWrapped.getArguments(
      {
        resolverTypeName: parentName,
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
    this.sqlDirectiveFields.forEach((resolverFns) => {
      resolverFns.forEach((config) => {
        const { resolverTypeName, resolverFieldName } = config;
        const customSqlDataSourceStrategy = context.customSqlDataSourceStrategies.find((customSqlStrategy) => {
          customSqlStrategy.typeName === resolverTypeName && customSqlStrategy.fieldName === resolverFieldName;
        });

        if (!customSqlDataSourceStrategy) {
          throw new Error(`Could not find a CustomSqlDataSourceStrategy for ${resolverTypeName}.${resolverFieldName}`);
        }

        const { SQLLambdaDataSourceLogicalIDPrefix } = ResourceConstants.RESOURCES;
        const dataSourceId = getSqlResourceNameForStrategy(SQLLambdaDataSourceLogicalIDPrefix, customSqlDataSourceStrategy.strategy);

        const stackName = getSqlResourceNameForStrategy(SQL_DIRECTIVE_STACK_PREFIX, customSqlDataSourceStrategy.strategy);
        const stack: cdk.Stack = context.stackManager.createStack(stackName);
        const env = context.synthParameters.amplifyEnvironmentName;

        stack.templateOptions.templateFormatVersion = '2010-09-09';
        stack.templateOptions.description = `An auto-generated nested stack for @sql directives resolved by ${dataSourceId} data source.`;

        new cdk.CfnCondition(stack, ResourceConstants.CONDITIONS.HasEnvironmentParameter, {
          expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(env, ResourceConstants.NONE)),
        });

        // TODO: Support schemas with no models, only custom SQL. As a workaround in the meantime, customers can create a small model
        // pointing to the data source they want to use for their custom SQL statements.
        const dataSource = context.api.host.getDataSource(dataSourceId);
        const statement = getStatement(config, customSqlDataSourceStrategy.strategy.customSqlStatements ?? {});
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
            generateAuthExpressionForSandboxMode(context.transformParameters.sandboxModeEnabled),
            `${config.resolverTypeName}.${config.resolverFieldName}.{slotName}.{slotIndex}.req.vtl`,
          ),
        );
        resolver.setScope(context.stackManager.getScopeFor(resolverResourceId, stackName));
        context.resolvers.addResolver(config.resolverTypeName, config.resolverFieldName, resolver);
      });
    });
  };
}

const generateAuthExpressionForSandboxMode = (enabled: boolean): string => {
  let exp;
  const API_KEY = 'API Key Authorization';

  if (enabled) exp = iff(notEquals(methodCall(ref('util.authType')), str(API_KEY)), methodCall(ref('util.unauthorized')));
  else exp = methodCall(ref('util.unauthorized'));

  return printBlock(`Sandbox Mode ${enabled ? 'Enabled' : 'Disabled'}`)(
    compoundExpression([iff(not(ref('ctx.stash.get("hasAuth")')), exp), toJson(obj({}))]),
  );
};

const getStatement = (config: SqlDirectiveConfiguration, customQueries: Record<string, string>): string => {
  if (config.reference && !customQueries[config.reference]) {
    throw new InvalidDirectiveError(
      `@sql directive 'reference' argument must be a valid custom query name. Check type "${config.resolverTypeName}" and field "${config.resolverFieldName}". The custom query "${config.reference}" does not exist in "sql-statements" directory.`,
    );
  }

  if (config.reference && config.statement) {
    throw new InvalidDirectiveError(
      `@sql directive can have either 'statement' or 'reference' argument but not both. Check type "${config.resolverTypeName}" and field "${config.resolverFieldName}".`,
    );
  }

  if (config.statement !== undefined && config.statement.trim().length === 0) {
    throw new InvalidDirectiveError(
      `@sql directive 'statement' argument must not be empty. Check type "${config.resolverTypeName}" and field "${config.resolverFieldName}".`,
    );
  }

  const statement = config.statement ?? customQueries[config.reference!];
  return statement!;
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
