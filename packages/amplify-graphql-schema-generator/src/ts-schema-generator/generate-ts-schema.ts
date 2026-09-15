import * as ts from 'typescript';
import { Schema } from '../schema-representation';
import { createImportExpression, createSchema, DataSourceGenerateConfig } from './helpers';

const file = ts.createSourceFile('schema.ts', '', ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS);
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

export const generateTypescriptDataSchema = (schema: Schema, config?: DataSourceGenerateConfig): string => {
  const containsSecret = !!(config?.secretNames?.connectionUri || config?.secretNames?.sslCertificate);
  const result = printer.printList(
    ts.ListFormat.MultiLine,
    ts.factory.createNodeArray([
      ...createImportExpression(containsSecret),
      ts.factory.createIdentifier('\n'),
      createSchema(schema, config),
    ]),
    file,
  );
  return result;
};
