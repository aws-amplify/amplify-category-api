import * as ts from 'typescript';
import { Schema } from '@aws-amplify/graphql-schema-generator';
import { createImportExpression, createSchema, DataSourceConfig } from './helpers';

const file = ts.createSourceFile('schema.ts', '', ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS);
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

export const generateTypescriptDataSchema = (schema: Schema, config?: DataSourceConfig): string => {
  const containsSecretName = !!config?.secretName;
  const result = printer.printList(
    ts.ListFormat.MultiLine,
    ts.factory.createNodeArray([
      ...createImportExpression(containsSecretName),
      ts.factory.createIdentifier('\n'),
      createSchema(schema, config),
    ]),
    file,
  );
  return result;
};
