import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ResolverResourceIDs, ResourceConstants } from 'graphql-transformer-common';
import { MappingTemplate, getPrimaryKeyFields } from '@aws-amplify/graphql-transformer-core';
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
} from 'graphql-mapping-template';
import { HasManyDirectiveConfiguration } from '../types';
import { RelationalResolverGenerator } from './generator';

const CONNECTION_STACK = 'ConnectionStack';

export class RDSRelationalResolverGenerator implements RelationalResolverGenerator {
  /**
   * Create a resolver that queries an item in RDS.
   * @param config The connection directive configuration.
   * @param ctx The transformer context provider.
   */
  makeQueryConnectionWithKeyResolver = (config: HasManyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
    const { field, references, limit, object, relatedType } = config;
    const { RDSLambdaDataSourceLogicalID } = ResourceConstants.RESOURCES;
    const dataSource = ctx.api.host.getDataSource(RDSLambdaDataSourceLogicalID);

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
        this.generateConnectionLambdaRequestTemplate(relatedType.name.value, 'LIST', 'ConnectionQuery', connectionCondition),
        `${object.name.value}.${field.name.value}.req.vtl`,
      ),
      MappingTemplate.s3MappingTemplateFromString(
        this.generateConnectionLambdaResponseMappingTemplate(),
        `${object.name.value}.${field.name.value}.res.vtl`,
      ),
    );

    resolver.mapToStack(ctx.stackManager.getStackFor(resolverResourceId, CONNECTION_STACK));
    ctx.resolvers.addResolver(object.name.value, field.name.value, resolver);
  };

  /**
   * Generate connection request template for RDS.
   */
  generateConnectionLambdaRequestTemplate = (
    tableName: string,
    operation: string,
    operationName: string,
    joinCondition: Expression[],
  ): string => {
    return printBlock('Invoke RDS Lambda data source')(
      compoundExpression([
        set(ref('lambdaInput'), obj({})),
        set(ref('lambdaInput.args'), obj({})),
        set(ref('lambdaInput.table'), str(tableName)),
        set(ref('lambdaInput.operation'), str(operation)),
        set(ref('lambdaInput.operationName'), str(operationName)),
        set(ref('lambdaInput.args.metadata'), obj({})),
        set(ref('lambdaInput.args.metadata.keys'), list([])),
        qref(methodCall(ref('lambdaInput.args.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments'), obj({})))),
        iff(not(ref('lambdaInput.args.filter')), set(ref('lambdaInput.args.filter'), obj({}))),
        ...joinCondition,
        qref(
          methodCall(ref('lambdaInput.args.metadata.keys.addAll'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.keys'), list([]))),
        ),
        set(ref('lambdaInput.args.input'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.defaultValues'), obj({}))),
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
}
