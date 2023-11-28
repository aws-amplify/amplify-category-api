import { ref, obj, str, forEach, qref, set, compoundExpression, ifElse, nul, bool, methodCall, list, Expression } from '../ast';
import { DynamoDBMappingTemplate } from '../dynamodb';
import { vtlPrinter, jsPrinter } from '../printer';

const validateResolver = (expression: Expression): void => {
  expect(vtlPrinter.print(expression)).toMatchSnapshot();
  expect(jsPrinter.print(expression)).toMatchSnapshot();
};

test('create a put item resolver with the ast', () => {
  validateResolver(
    DynamoDBMappingTemplate.putItem({
      key: obj({
        type: str('Post'),
        id: ref('util.autoId()'),
      }),
      attributeValues: obj({
        value: methodCall(ref('util.dynamodb.toMapJson'), ref('ctx.input')),
      }),
    }),
  );
});

test('create a query resolver with the ast', () => {
  validateResolver(
    DynamoDBMappingTemplate.query({
      query: obj({
        expression: str('#typename = :typename'),
        expressionNames: obj({
          '#typename': str('__typename'),
        }),
        expressionValues: obj({
          ':typename': obj({
            S: str('test'),
          }),
        }),
      }),
      scanIndexForward: bool(true),
      filter: ifElse(
        ref('context.args.filter'),
        methodCall(ref('util.transform.toDynamoDBFilterExpression'), ref('ctx.args.filter')),
        nul(),
      ),
      limit: ref('limit'),
      nextToken: ifElse(ref('context.args.nextToken'), ref('context.args.nextToken'), nul()),
    }),
  );
});

test('create a response mapping template that merges a nested object', () => {
  validateResolver(
    compoundExpression([
      set(ref('result'), methodCall(ref('util.map.copyAndRemoveAllKeys'), ref('context.result'), list([str('value')]))),
      forEach(ref('entry'), ref('context.result.value.entrySet()'), [
        qref(methodCall(ref('result.put'), ref('entry.key'), ref('entry.value'))),
      ]),
      methodCall(ref('util.toJson'), ref('result')),
    ]),
  );
});
