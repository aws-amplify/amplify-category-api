import { TransformerContextProvider, TransformerResolverProvider } from '@aws-amplify/graphql-transformer-interfaces';
import {
  Expression,
  printBlock,
  compoundExpression,
  set,
  ref,
  list,
  qref,
  methodCall,
  str,
  obj,
} from 'graphql-mapping-template';
import { IndexDirectiveConfiguration, PrimaryKeyDirectiveConfiguration } from '../../types';
import _ from 'lodash';
import {
  addIndexToResolverSlot,
  getResolverObject,
  validateSortDirectionInput
} from '../resolvers';
import {
  IndexVTLGenerator,
} from "./vtl-generator";

export class RDSIndexVTLGenerator implements IndexVTLGenerator {

  generateIndexQueryRequestTemplate(
    config: IndexDirectiveConfiguration,
    ctx: TransformerContextProvider,
    tableName: string,
    operationName: string,
  ): string {
    //TODO: Verify correctness of template once Lambda code is merged.
    return printBlock('Invoke RDS Lambda data source')(
      compoundExpression([
        set(ref('args'), obj({})),
        set(ref('args.args'), ref('context.arguments')),
        set(ref('args.table'), str(tableName)),
        set(ref('args.operation'), str('QUERY')),
        set(ref('args.operationName'), str(operationName)),
        obj({
          version: str('2018-05-29'),
          operation: str('Invoke'),
          payload: methodCall(ref('util.toJson'), ref('args')),
        }),
      ]),
    );
  }

  generatePrimaryKeyVTL = (config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider, resolverMap: Map<TransformerResolverProvider, string>): void => {
    this.updateResolvers(config, ctx, resolverMap);
  };

  updateResolvers = (config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider, resolverMap: Map<TransformerResolverProvider, string>): void => {
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
      const sortDirectionValidation = printBlock('Validate the sort direction input')(compoundExpression(validateSortDirectionInput(config, true)));
      addIndexToResolverSlot(listResolver, [
        primaryKeySnippet,
        sortDirectionValidation
      ]);
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
    const expressions: Expression[] = [
      set(ref('keys'), list([])),
      qref(methodCall(ref('keys.add'), str(config.field.name.value)))
    ];

    config.sortKeyFields.map( field => {
      expressions.push(
        qref(methodCall(ref('keys.add'), str(field)))
      );
    });

    expressions.push(qref(methodCall(ref('ctx.stash.put'), str('keys'), ref('keys'))),);

    return printBlock('Set the primary key information in metadata')(compoundExpression(expressions));
  };
};
