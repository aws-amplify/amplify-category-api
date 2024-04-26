import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ResolverResourceIDs } from 'graphql-transformer-common';
import {
  MappingTemplate,
  constructArrayFieldsStatement,
  constructNonScalarFieldsStatement,
  getModelDataSourceNameForTypeName,
  getModelDataSourceStrategy,
  getPrimaryKeyFields,
  isSqlStrategy,
} from '@aws-amplify/graphql-transformer-core';
import {
  compoundExpression,
  ref,
  set,
  methodCall,
  ifElse,
  printBlock,
  qref,
  obj,
  str,
  list,
  Expression,
  toJson,
  iff,
  not,
  raw,
  nul,
  equals,
  forEach,
} from 'graphql-mapping-template';
import { OPERATION_KEY } from '@aws-amplify/graphql-model-transformer';
import { BelongsToDirectiveConfiguration, HasManyDirectiveConfiguration, HasOneDirectiveConfiguration } from '../types';
import { RelationalResolverGenerator } from './generator';

const CONNECTION_STACK = 'ConnectionStack';

export class RDSRelationalResolverGenerator extends RelationalResolverGenerator {
  /**
   * Create a resolver that queries an item in RDS.
   * @param config The connection directive configuration.
   * @param ctx The transformer context provider.
   */
  makeHasManyGetItemsConnectionWithKeyResolver = (config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
    const { field, references, object, relatedType } = config;
    const relatedStrategy = getModelDataSourceStrategy(ctx, relatedType.name.value);
    if (!isSqlStrategy(relatedStrategy)) {
      throw new Error('The @hasMany directive is only supported for SQL data sources.');
    }
    const dataSourceName = getModelDataSourceNameForTypeName(ctx, relatedType.name.value);
    const dataSource = ctx.api.host.getDataSource(dataSourceName);
    const mappedTableName = ctx.resourceHelper.getModelNameMapping(relatedType.name.value);

    const connectionCondition: Expression[] = [];
    const primaryKeys = getPrimaryKeyFields(object);
    references.forEach((r, index) => {
      connectionCondition.push(
        qref(
          methodCall(
            ref('lambdaInput.args.filter.put'),
            str(r),
            obj({ eq: ref(`util.defaultIfNull($ctx.source.${primaryKeys[index]}, "")`) }),
          ),
        ),
      );
    });
    const resolverResourceId = ResolverResourceIDs.ResolverResourceID(object.name.value, field.name.value);
    const resolver = ctx.resolvers.generateQueryResolver(
      object.name.value,
      field.name.value,
      resolverResourceId,
      dataSource as any,
      MappingTemplate.s3MappingTemplateFromString(
        this.generateHasManyLambdaRequestTemplate(mappedTableName, 'LIST', 'ConnectionQuery', connectionCondition, ctx),
        `${object.name.value}.${field.name.value}.req.vtl`,
      ),
      MappingTemplate.s3MappingTemplateFromString(
        this.generateListConnectionLambdaResponseMappingTemplate(),
        `${object.name.value}.${field.name.value}.res.vtl`,
      ),
    );

    resolver.setScope(ctx.stackManager.getScopeFor(resolverResourceId, CONNECTION_STACK));
    ctx.resolvers.addResolver(object.name.value, field.name.value, resolver);
  };

  /**
   * Generate hasMany request template for RDS.
   */
  generateHasManyLambdaRequestTemplate = (
    tableName: string,
    operation: string,
    operationName: string,
    joinCondition: Expression[],
    ctx: TransformerContextProvider,
  ): string => {
    return printBlock('Invoke RDS Lambda data source')(
      compoundExpression([
        iff(ref('ctx.stash.deniedField'), raw('#return($util.toJson(null))')),
        set(ref('lambdaInput'), obj({})),
        set(ref('lambdaInput.args'), obj({})),
        set(ref('lambdaInput.table'), str(tableName)),
        set(ref('lambdaInput.operation'), str(operation)),
        set(ref('lambdaInput.operationName'), str(operationName)),
        set(ref('lambdaInput.args.metadata'), obj({})),
        set(ref('lambdaInput.args.metadata.keys'), list([])),
        constructArrayFieldsStatement(tableName, ctx),
        constructNonScalarFieldsStatement(tableName, ctx),
        this.constructFieldMappingInput(),
        qref(methodCall(ref('lambdaInput.args.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments'), obj({})))),
        iff(not(ref('lambdaInput.args.filter')), set(ref('lambdaInput.args.filter'), obj({}))),
        this.constructRelationalFieldAuthFilterStatement('lambdaInput.args.metadata.authFilter'),
        ...joinCondition,
        qref(
          methodCall(ref('lambdaInput.args.metadata.keys.addAll'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.keys'), list([]))),
        ),
        obj({
          version: str('2018-05-29'),
          operation: str('Invoke'),
          payload: methodCall(ref('util.toJson'), ref('lambdaInput')),
        }),
      ]),
    );
  };

  /**
   * Generate hasOne request template for RDS.
   */
  generateHasOneLambdaRequestTemplate = (
    tableName: string,
    operation: string,
    operationName: string,
    joinCondition: Expression[],
    relatedTypePrimaryKeys: string[],
    ctx: TransformerContextProvider,
  ): string => {
    return printBlock('Invoke RDS Lambda data source')(
      compoundExpression([
        iff(ref('ctx.stash.deniedField'), raw('#return($util.toJson(null))')),
        set(ref('lambdaInput'), obj({})),
        set(ref('lambdaInput.args'), obj({})),
        set(ref('lambdaInput.table'), str(tableName)),
        set(ref('lambdaInput.operation'), str(operation)),
        set(ref('lambdaInput.operationName'), str(operationName)),
        set(ref('lambdaInput.args.metadata'), obj({})),
        set(ref('lambdaInput.args.metadata.keys'), list(relatedTypePrimaryKeys.map((key) => str(key)))),
        constructArrayFieldsStatement(tableName, ctx),
        constructNonScalarFieldsStatement(tableName, ctx),
        this.constructFieldMappingInput(),
        qref(methodCall(ref('lambdaInput.args.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments'), obj({})))),
        iff(not(ref('lambdaInput.args.input')), set(ref('lambdaInput.args.input'), obj({}))),
        this.constructRelationalFieldAuthFilterStatement('lambdaInput.args.metadata.authFilter'),
        ...joinCondition,
        obj({
          version: str('2018-05-29'),
          operation: str('Invoke'),
          payload: methodCall(ref('util.toJson'), ref('lambdaInput')),
        }),
      ]),
    );
  };

  /**
   * Generate connection response template for RDS.
   */
  generateSingleItemConnectionLambdaResponseMappingTemplate = (): string => {
    const statements: Expression[] = [];
    statements.push(
      ifElse(
        ref('ctx.error'),
        methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type')),

        // Make sure the retrieved item has the __operation field, so the individual type resolver can appropriately redact fields
        compoundExpression([
          set(ref('resultValue'), ref('ctx.result')),
          set(ref('operation'), methodCall(ref('util.defaultIfNull'), methodCall(ref('ctx.source.get'), str(OPERATION_KEY)), nul())),
          iff(equals(ref('operation'), str('Mutation')), qref(methodCall(ref('resultValue.put'), str(OPERATION_KEY), str('Mutation')))),
          toJson(ref('resultValue')),
        ]),
      ),
    );
    return printBlock('ResponseTemplate')(compoundExpression(statements));
  };

  generateListConnectionLambdaResponseMappingTemplate = (): string => {
    const statements: Expression[] = [];
    statements.push(
      ifElse(
        ref('ctx.error'),
        methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type')),
        // Make sure each retrieved item has the __operation field, so the individual type resolver can appropriately redact fields
        compoundExpression([
          set(ref('resultValue'), ref('ctx.result')),
          iff(
            equals(methodCall(ref('util.defaultIfNull'), methodCall(ref('ctx.source.get'), str(OPERATION_KEY)), nul()), str('Mutation')),
            forEach(ref('item'), ref('resultValue.items'), [qref(methodCall(ref('item.put'), str(OPERATION_KEY), str('Mutation')))]),
          ),
          raw('$util.toJson($resultValue)'),
        ]),
      ),
    );
    return printBlock('ResponseTemplate')(compoundExpression(statements));
  };

  /**
   * Create a get item resolver for singular connections.
   * @param config The connection directive configuration.
   * @param ctx The transformer context provider.
   */
  makeHasOneGetItemConnectionWithKeyResolver = (
    config: HasOneDirectiveConfiguration | BelongsToDirectiveConfiguration,
    ctx: TransformerContextProvider,
  ): void => {
    const { field, references, object, relatedType } = config;
    const relatedStrategy = getModelDataSourceStrategy(ctx, relatedType.name.value);
    if (!isSqlStrategy(relatedStrategy)) {
      throw new Error('The @hasOne directive is only supported for SQL data sources.');
    }
    const dataSourceName = getModelDataSourceNameForTypeName(ctx, relatedType.name.value);
    const dataSource = ctx.api.host.getDataSource(dataSourceName);
    const mappedTableName = ctx.resourceHelper.getModelNameMapping(relatedType.name.value);

    const connectionCondition: Expression[] = [];
    const primaryKeys = getPrimaryKeyFields(object);
    const relatedTypePrimaryKeys = getPrimaryKeyFields(relatedType);
    references.forEach((r, index) => {
      connectionCondition.push(
        qref(
          methodCall(
            ref('lambdaInput.args.input.put'),
            str(r),
            obj({ eq: ref(`util.defaultIfNull($ctx.source.${primaryKeys[index]}, "")`) }),
          ),
        ),
      );
    });
    const resolverResourceId = ResolverResourceIDs.ResolverResourceID(object.name.value, field.name.value);
    const resolver = ctx.resolvers.generateQueryResolver(
      object.name.value,
      field.name.value,
      resolverResourceId,
      dataSource as any,
      MappingTemplate.s3MappingTemplateFromString(
        this.generateHasOneLambdaRequestTemplate(
          mappedTableName,
          'GET_FIRST',
          'GetItemConnectionQuery',
          connectionCondition,
          relatedTypePrimaryKeys,
          ctx,
        ),
        `${object.name.value}.${field.name.value}.req.vtl`,
      ),
      MappingTemplate.s3MappingTemplateFromString(
        this.generateSingleItemConnectionLambdaResponseMappingTemplate(),
        `${object.name.value}.${field.name.value}.res.vtl`,
      ),
    );

    resolver.setScope(ctx.stackManager.getScopeFor(resolverResourceId, CONNECTION_STACK));
    ctx.resolvers.addResolver(object.name.value, field.name.value, resolver);
  };

  makeBelongsToGetItemConnectionWithKeyResolver = (config: BelongsToDirectiveConfiguration, ctx: TransformerContextProvider): void => {
    const { field, references, object, relatedType } = config;
    const relatedStrategy = getModelDataSourceStrategy(ctx, relatedType.name.value);
    if (!isSqlStrategy(relatedStrategy)) {
      throw new Error('The @belongsTo directive is only supported for SQL data sources.');
    }
    const dataSourceName = getModelDataSourceNameForTypeName(ctx, relatedType.name.value);
    const dataSource = ctx.api.host.getDataSource(dataSourceName);
    const mappedTableName = ctx.resourceHelper.getModelNameMapping(relatedType.name.value);

    const connectionCondition: Expression[] = [];
    const primaryKeys = getPrimaryKeyFields(relatedType);
    references.forEach((r, index) => {
      connectionCondition.push(
        qref(methodCall(ref('lambdaInput.args.input.put'), str(primaryKeys[index]), ref(`util.defaultIfNull($ctx.source.${r}, "")`))),
      );
    });
    const resolverResourceId = ResolverResourceIDs.ResolverResourceID(object.name.value, field.name.value);
    const resolver = ctx.resolvers.generateQueryResolver(
      object.name.value,
      field.name.value,
      resolverResourceId,
      dataSource as any,
      MappingTemplate.s3MappingTemplateFromString(
        this.generateHasOneLambdaRequestTemplate(mappedTableName, 'GET', 'BelongsToConnectionQuery', connectionCondition, primaryKeys, ctx),
        `${object.name.value}.${field.name.value}.req.vtl`,
      ),
      MappingTemplate.s3MappingTemplateFromString(
        this.generateSingleItemConnectionLambdaResponseMappingTemplate(),
        `${object.name.value}.${field.name.value}.res.vtl`,
      ),
    );

    resolver.setScope(ctx.stackManager.getScopeFor(resolverResourceId, CONNECTION_STACK));
    ctx.resolvers.addResolver(object.name.value, field.name.value, resolver);
  };

  constructFieldMappingInput = (): Expression => {
    return compoundExpression([
      set(ref('lambdaInput.args.metadata.fieldMap'), obj({})),
      qref(
        methodCall(
          ref('lambdaInput.args.metadata.fieldMap.putAll'),
          methodCall(ref('util.defaultIfNull'), ref('context.stash.fieldMap'), obj({})),
        ),
      ),
    ]);
  };

  constructRelationalFieldAuthFilterStatement = (keyName: string): Expression =>
    iff(not(methodCall(ref('util.isNullOrEmpty'), ref('ctx.stash.authFilter'))), set(ref(keyName), ref('ctx.stash.authFilter')));
}
