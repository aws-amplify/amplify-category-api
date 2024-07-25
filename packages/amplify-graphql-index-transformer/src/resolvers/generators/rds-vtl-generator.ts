import { TransformerContextProvider, TransformerResolverProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Expression, printBlock, compoundExpression, set, ref, list, qref, methodCall, str, obj } from 'graphql-mapping-template';
import _ from 'lodash';
import { IndexDirectiveConfiguration, PrimaryKeyDirectiveConfiguration } from '../../types';
import { addIndexToResolverSlot, getResolverObject, validateSortDirectionInput } from '../resolvers';
import { IndexVTLGenerator } from './vtl-generator';

export class RDSIndexVTLGenerator implements IndexVTLGenerator {
  generateIndexQueryRequestTemplate(
    config: IndexDirectiveConfiguration,
    ctx: TransformerContextProvider,
    tableName: string,
    operationName: string,
  ): string {
    const mappedTableName = ctx.resourceHelper.getModelNameMapping(tableName);
    return printBlock('Invoke RDS Lambda data source')(
      compoundExpression([
        set(ref('lambdaInput'), obj({})),
        set(ref('lambdaInput.args'), obj({})),
        set(ref('lambdaInput.table'), str(mappedTableName)),
        set(ref('lambdaInput.operation'), str('INDEX')),
        set(ref('lambdaInput.operationName'), str(operationName)),
        set(ref('lambdaInput.args.metadata'), obj({})),
        set(ref('lambdaInput.args.metadata.keys'), list([])),
        set(ref('lambdaInput.args.metadata.fieldMap'), obj({})),
        qref(
          methodCall(
            ref('lambdaInput.args.metadata.fieldMap.putAll'),
            methodCall(ref('util.defaultIfNull'), ref('context.stash.fieldMap'), obj({})),
          ),
        ),
        qref(
          methodCall(ref('lambdaInput.args.metadata.keys.addAll'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.keys'), list([]))),
        ),
        set(ref('lambdaInput.args.input'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.defaultValues'), obj({}))),
        qref(methodCall(ref('lambdaInput.args.input.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments'), obj({})))),
        obj({
          version: str('2018-05-29'),
          operation: str('Invoke'),
          payload: methodCall(ref('util.toJson'), ref('lambdaInput')),
        }),
      ]),
    );
  }

  generatePrimaryKeyVTL = (
    config: PrimaryKeyDirectiveConfiguration,
    ctx: TransformerContextProvider,
    resolverMap: Map<TransformerResolverProvider, string>,
  ): void => {
    this.updateResolvers(config, ctx, resolverMap);
  };

  updateResolvers = (
    config: PrimaryKeyDirectiveConfiguration,
    ctx: TransformerContextProvider,
    resolverMap: Map<TransformerResolverProvider, string>,
  ): void => {
    const getResolver = getResolverObject(config, ctx, 'get');
    const listResolver = getResolverObject(config, ctx, 'list');
    const createResolver = getResolverObject(config, ctx, 'create');
    const updateResolver = getResolverObject(config, ctx, 'update');
    const deleteResolver = getResolverObject(config, ctx, 'delete');

    const primaryKeySnippet = this.setPrimaryKeySnippet(config);

    if (getResolver) {
      addIndexToResolverSlot(getResolver, [primaryKeySnippet]);
    }

    if (listResolver) {
      const sortDirectionValidation = printBlock('Validate the sort direction input')(
        compoundExpression(validateSortDirectionInput(config, true)),
      );
      addIndexToResolverSlot(listResolver, [primaryKeySnippet, sortDirectionValidation]);
    }

    if (createResolver) {
      addIndexToResolverSlot(createResolver, [primaryKeySnippet]);
    }

    if (updateResolver) {
      addIndexToResolverSlot(updateResolver, [primaryKeySnippet]);
    }

    if (deleteResolver) {
      addIndexToResolverSlot(deleteResolver, [primaryKeySnippet]);
    }
  };

  setPrimaryKeySnippet = (config: PrimaryKeyDirectiveConfiguration): string => {
    const expressions: Expression[] = [set(ref('keys'), list([])), qref(methodCall(ref('keys.add'), str(config.field.name.value)))];

    config.sortKeyFields.map((field) => {
      expressions.push(qref(methodCall(ref('keys.add'), str(field))));
    });

    expressions.push(qref(methodCall(ref('ctx.stash.put'), str('keys'), ref('keys'))));

    return printBlock('Set the primary key information in metadata')(compoundExpression(expressions));
  };
}
