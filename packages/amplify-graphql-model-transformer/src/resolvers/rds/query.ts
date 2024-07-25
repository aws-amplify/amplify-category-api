import {
  constructArrayFieldsStatement,
  constructAuthFilterStatement,
  constructFieldMappingInput,
  constructNonScalarFieldsStatement,
} from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { compoundExpression, list, methodCall, obj, printBlock, qref, ref, set, str } from 'graphql-mapping-template';

export const generateLambdaListRequestTemplate = (
  tableName: string,
  operation: string,
  operationName: string,
  ctx: TransformerContextProvider,
): string => {
  const mappedTableName = ctx.resourceHelper.getModelNameMapping(tableName);
  return printBlock('Invoke RDS Lambda data source')(
    compoundExpression([
      set(ref('lambdaInput'), obj({})),
      set(ref('lambdaInput.args'), obj({})),
      set(ref('lambdaInput.table'), str(mappedTableName)),
      set(ref('lambdaInput.operation'), str(operation)),
      set(ref('lambdaInput.operationName'), str(operationName)),
      set(ref('lambdaInput.args.metadata'), obj({})),
      set(ref('lambdaInput.args.metadata.keys'), list([])),
      constructAuthFilterStatement('lambdaInput.args.metadata.authFilter'),
      constructNonScalarFieldsStatement(tableName, ctx),
      constructArrayFieldsStatement(tableName, ctx),
      constructFieldMappingInput(),
      qref(
        methodCall(ref('lambdaInput.args.metadata.keys.addAll'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.keys'), list([]))),
      ),
      set(ref('lambdaInput.args.input'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.defaultValues'), obj({}))),
      qref(methodCall(ref('lambdaInput.args.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments'), obj({})))),
      obj({
        version: str('2018-05-29'),
        operation: str('Invoke'),
        payload: methodCall(ref('util.toJson'), ref('lambdaInput')),
      }),
    ]),
  );
};
