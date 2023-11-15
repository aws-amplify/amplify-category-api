import * as fs from 'fs-extra';
import _ from 'lodash';
import { DocumentNode, StringValueNode } from 'graphql';
import { readRDSGlobalAmplifyInput } from '@aws-amplify/graphql-schema-generator';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';

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

export const getEngineInput = (schemaDocument: DocumentNode): ImportedRDSType => {
  const inputNode = readRDSGlobalAmplifyInput(schemaDocument);
  if (inputNode) {
    const engine = (inputNode.fields.find((field) => field.name.value === 'engine')?.defaultValue as StringValueNode)?.value;
    if (engine && !Object.values(ImportedRDSType).includes(engine as ImportedRDSType)) {
      throw new Error(`engine input ${engine} is not supported.`);
    }
    return engine as ImportedRDSType;
  }
  return ImportedRDSType.MYSQL;
};
