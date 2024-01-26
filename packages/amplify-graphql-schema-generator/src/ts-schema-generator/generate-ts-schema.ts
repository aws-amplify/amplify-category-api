import * as ts from 'typescript';
import { Schema } from '../schema-representation';
import { createImportExpression, createSchema } from './helpers';

const file = ts.createSourceFile('schema.ts', '', ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS);
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

export const generateTypeBeastSchema = (schema: Schema): string => {
  const result = printer.printList(
    ts.ListFormat.MultiLine,
    ts.factory.createNodeArray([createImportExpression(), ts.factory.createIdentifier('\n'), createSchema(schema)]),
    file,
  );
  return result;
};
