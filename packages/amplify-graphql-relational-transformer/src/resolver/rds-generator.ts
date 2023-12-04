import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ResolverResourceIDs } from 'graphql-transformer-common';
import {
  MappingTemplate,
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
} from 'graphql-mapping-template';
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
        this.generateHasManyLambdaRequestTemplate(mappedTableName, 'LIST', 'ConnectionQuery', connectionCondition),
        `${object.name.value}.${field.name.value}.req.vtl`,
      ),
      MappingTemplate.s3MappingTemplateFromString(
        this.generateConnectionLambdaResponseMappingTemplate(),
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
        this.constructFieldMappingInput(),
        qref(methodCall(ref('lambdaInput.args.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments'), obj({})))),
        iff(not(ref('lambdaInput.args.filter')), set(ref('lambdaInput.args.filter'), obj({}))),
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
        this.constructFieldMappingInput(),
        qref(methodCall(ref('lambdaInput.args.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments'), obj({})))),
        iff(not(ref('lambdaInput.args.input')), set(ref('lambdaInput.args.input'), obj({}))),
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
  generateConnectionLambdaResponseMappingTemplate = (): string => {
    const statements: Expression[] = [];
    statements.push(
      ifElse(ref('ctx.error'), methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type')), toJson(ref('ctx.result'))),
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
        ),
        `${object.name.value}.${field.name.value}.req.vtl`,
      ),
      MappingTemplate.s3MappingTemplateFromString(
        this.generateConnectionLambdaResponseMappingTemplate(),
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
        this.generateHasOneLambdaRequestTemplate(mappedTableName, 'GET', 'BelongsToConnectionQuery', connectionCondition, primaryKeys),
        `${object.name.value}.${field.name.value}.req.vtl`,
      ),
      MappingTemplate.s3MappingTemplateFromString(
        this.generateConnectionLambdaResponseMappingTemplate(),
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
}
