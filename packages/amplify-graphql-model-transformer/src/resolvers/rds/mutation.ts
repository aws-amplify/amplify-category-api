import {
  comment,
  compoundExpression,
  Expression,
  list,
  methodCall,
  obj,
  printBlock,
  qref,
  ref,
  set,
  str,
  toJson,
} from 'graphql-mapping-template';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { ModelDirectiveConfiguration } from '../../directive';
import { constructArrayFieldsStatement, constructFieldMappingInput, constructNonScalarFieldsStatement } from './resolver';

/**
 * Generate mapping template that sets default values for create mutation
 * @param modelConfig directive configuration
 */
export const generateCreateInitSlotTemplate = (modelConfig: ModelDirectiveConfiguration, initializeIdField: boolean): string => {
  const statements: Expression[] = [
    // initialize defaultValues
    qref(
      methodCall(
        ref('ctx.stash.put'),
        str('defaultValues'),
        methodCall(ref('util.defaultIfNull'), ref('ctx.stash.defaultValues'), obj({})),
      ),
    ),
  ];

  if (initializeIdField) {
    statements.push(qref(methodCall(ref('ctx.stash.defaultValues.put'), str('id'), methodCall(ref('util.autoId')))));
  }
  if (modelConfig?.timestamps) {
    statements.push(set(ref('createdAt'), methodCall(ref('util.time.nowISO8601'))));
    if (modelConfig.timestamps.createdAt) {
      statements.push(qref(methodCall(ref('ctx.stash.defaultValues.put'), str(modelConfig.timestamps.createdAt), ref('createdAt'))));
    }
    if (modelConfig.timestamps.updatedAt) {
      statements.push(qref(methodCall(ref('ctx.stash.defaultValues.put'), str(modelConfig.timestamps.updatedAt), ref('createdAt'))));
    }
  }
  statements.push(
    toJson(
      obj({
        version: str('2018-05-29'),
        payload: obj({}),
      }),
    ),
  );
  return printBlock('Initialization default values')(compoundExpression(statements));
};

export const generateLambdaCreateRequestTemplate = (tableName: string, operationName: string, ctx: TransformerContextProvider): string => {
  const mappedTableName = ctx.resourceHelper.getModelNameMapping(tableName);
  return printBlock('Invoke RDS Lambda data source')(
    compoundExpression([
      set(ref('lambdaInput'), obj({})),
      set(ref('lambdaInput.table'), str(mappedTableName)),
      set(ref('lambdaInput.args'), obj({})),
      set(ref('lambdaInput.operation'), str('CREATE')),
      set(ref('lambdaInput.operationName'), str(operationName)),
      set(ref('lambdaInput.args.metadata'), obj({})),
      set(ref('lambdaInput.args.metadata.keys'), list([])),
      constructNonScalarFieldsStatement(tableName, ctx),
      constructArrayFieldsStatement(tableName, ctx),
      constructFieldMappingInput(),
      qref(
        methodCall(ref('lambdaInput.args.metadata.keys.addAll'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.keys'), list([]))),
      ),
      comment('Set the default values to put request'),
      set(ref('lambdaInput.args.input'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.defaultValues'), obj({}))),
      comment('copy the values from input'),
      qref(
        methodCall(ref('lambdaInput.args.input.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments.input'), obj({}))),
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
 * Generate VTL template that sets the default values for Update mutation
 * @param modelConfig model directive configuration
 */
export const generateUpdateInitSlotTemplate = (modelConfig: ModelDirectiveConfiguration): string => {
  const statements: Expression[] = [
    // initialize defaultValues
    qref(
      methodCall(
        ref('ctx.stash.put'),
        str('defaultValues'),
        methodCall(ref('util.defaultIfNull'), ref('ctx.stash.defaultValues'), obj({})),
      ),
    ),
  ];
  if (modelConfig?.timestamps) {
    if (modelConfig.timestamps.updatedAt) {
      statements.push(set(ref('updatedAt'), methodCall(ref('util.time.nowISO8601'))));
      statements.push(qref(methodCall(ref('ctx.stash.defaultValues.put'), str(modelConfig.timestamps.updatedAt), ref('updatedAt'))));
    }
  }
  statements.push(
    toJson(
      obj({
        version: str('2018-05-29'),
        payload: obj({}),
      }),
    ),
  );
  return printBlock('Initialization default values')(compoundExpression(statements));
};

/**
 * Generate VTL template that calls the lambda for an Update mutation
 */
export const generateLambdaUpdateRequestTemplate = (
  tableName: string,
  operationName: string,
  modelIndexFields: string[],
  ctx: TransformerContextProvider,
): string => {
  const mappedTableName = ctx.resourceHelper.getModelNameMapping(tableName);
  return printBlock('Invoke RDS Lambda data source')(
    compoundExpression([
      set(ref('lambdaInput'), obj({})),
      set(ref('lambdaInput.table'), str(mappedTableName)),
      set(ref('lambdaInput.args'), obj({})),
      set(ref('lambdaInput.operation'), str('UPDATE')),
      set(ref('lambdaInput.operationName'), str(operationName)),
      set(ref('lambdaInput.args.metadata'), obj({})),
      set(ref('lambdaInput.args.metadata.keys'), list([])),
      constructNonScalarFieldsStatement(tableName, ctx),
      constructArrayFieldsStatement(tableName, ctx),
      constructFieldMappingInput(),
      qref(
        methodCall(ref('lambdaInput.args.metadata.keys.addAll'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.keys'), list([]))),
      ),
      comment('Set the default values to put request'),
      set(ref('lambdaInput.args.input'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.defaultValues'), obj({}))),
      comment('copy the values from input'),
      qref(
        methodCall(ref('lambdaInput.args.input.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments.input'), obj({}))),
      ),
      set(ref('lambdaInput.args.condition'), methodCall(ref('util.defaultIfNull'), ref('context.arguments.condition'), obj({}))),
      obj({
        version: str('2018-05-29'),
        operation: str('Invoke'),
        payload: methodCall(ref('util.toJson'), ref('lambdaInput')),
      }),
    ]),
  );
};

/**
 * Generate VTL template that calls the lambda for a Delete mutation
 */
export const generateLambdaDeleteRequestTemplate = (
  tableName: string,
  operationName: string,
  modelIndexFields: string[],
  ctx: TransformerContextProvider,
): string => {
  const mappedTableName = ctx.resourceHelper.getModelNameMapping(tableName);
  return printBlock('Invoke RDS Lambda data source')(
    compoundExpression([
      set(ref('lambdaInput'), obj({})),
      set(ref('lambdaInput.table'), str(mappedTableName)),
      set(ref('lambdaInput.args'), ref('context.arguments')),
      set(ref('lambdaInput.operation'), str('DELETE')),
      set(ref('lambdaInput.operationName'), str(operationName)),
      set(ref('lambdaInput.args.metadata'), obj({})),
      set(ref('lambdaInput.args.metadata.keys'), list([])),
      constructNonScalarFieldsStatement(tableName, ctx),
      constructArrayFieldsStatement(tableName, ctx),
      constructFieldMappingInput(),
      qref(
        methodCall(ref('lambdaInput.args.metadata.keys.addAll'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.keys'), list([]))),
      ),
      set(ref('lambdaInput.args.condition'), methodCall(ref('util.defaultIfNull'), ref('context.arguments.condition'), obj({}))),
      obj({
        version: str('2018-05-29'),
        operation: str('Invoke'),
        payload: methodCall(ref('util.toJson'), ref('lambdaInput')),
      }),
    ]),
  );
};
