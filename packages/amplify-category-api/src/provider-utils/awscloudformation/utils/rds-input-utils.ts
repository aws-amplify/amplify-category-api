import * as fs from 'fs-extra';
import _ from 'lodash';
import { DocumentNode, StringValueNode } from 'graphql';
import { readRDSGlobalAmplifyInput } from '@aws-amplify/graphql-schema-generator';
import { ImportedSQLType } from '@aws-amplify/graphql-transformer-core';

export const readRDSSchema = (pathToSchemaFile: string): string | undefined => {
  if (!fs.existsSync(pathToSchemaFile)) {
    return;
  }
  const schemaContent = fs.readFileSync(pathToSchemaFile, 'utf-8');
  if (_.isEmpty(schemaContent)) {
    return;
  }
  return schemaContent;
};

export const getEngineInput = (schemaDocument: DocumentNode): ImportedSQLType => {
  const inputNode = readRDSGlobalAmplifyInput(schemaDocument);
  if (inputNode) {
    const engine = (inputNode.fields.find((field) => field.name.value === 'engine')?.defaultValue as StringValueNode)?.value;
    if (engine && !Object.values(ImportedSQLType).includes(engine as ImportedSQLType)) {
      throw new Error(`engine input ${engine} is not supported.`);
    }
    return engine as ImportedSQLType;
  }
  return ImportedSQLType.MYSQL;
};
