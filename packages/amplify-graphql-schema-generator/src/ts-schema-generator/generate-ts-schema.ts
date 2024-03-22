import * as ts from 'typescript';
import { Schema } from '../schema-representation';
import { createImportExpression, createSchema, DatasourceConfig } from './helpers';

const file = ts.createSourceFile('schema.ts', '', ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS);
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

export const generateTypescriptDataSchema = (schema: Schema, config?: DatasourceConfig): string => {
  const result = printer.printList(
    ts.ListFormat.MultiLine,
    ts.factory.createNodeArray([...createImportExpression(), ts.factory.createIdentifier('\n'), createSchema(schema, config)]),
    file,
  );
  return result;
};
