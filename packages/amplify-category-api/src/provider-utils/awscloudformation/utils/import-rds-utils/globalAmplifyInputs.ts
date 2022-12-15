import { ImportedRDSType } from '../../service-walkthrough-types/import-appsync-api-types';
import { parse } from 'graphql';
import * as fs from 'fs-extra';
import { $TSAny } from 'amplify-cli-core';
import _ from 'lodash';

const getGlobalAmplifyInputEntries = (dataSourceType: ImportedRDSType = ImportedRDSType.MYSQL) => {
  return [
    { 
      name: 'engine',
      type: 'String',
      default: dataSourceType,
    },
    {
      name: 'host',
      type: 'String',
      default: 'ENTER YOUR DATABASE HOSTNAME HERE',
    },
    {
      name: 'port',
      type: 'Int',
      default: 1010,
      comment: 'ENTER PORT NUMBER HERE'
    },
    {
      name: 'database',
      type: 'String',
      default: 'ENTER YOUR DATABASE NAME HERE'
    }
  ];
};

export const constructGlobalAmplifyInput = (dataSourceType: ImportedRDSType) => {
  const inputs = getGlobalAmplifyInputEntries(dataSourceType);
  const inputsString = inputs.reduce((acc: string, input): string =>
    acc + ` ${input.name}: ${input.type} = ${input.type === 'String' ? '"'+ input.default + '"' : input.default} ${input.comment ? '# ' + input.comment: ''} \n`
  , '');
  return `input Amplify {\n${inputsString}}\n`;
};

export const readGlobalAmplifyInput = async (pathToSchemaFile: string) => {
  const schemaContent = fs.readFileSync(pathToSchemaFile, 'utf-8');
  const parsedSchema = parse(schemaContent);

  const inputDirective: $TSAny = parsedSchema.definitions.find(
    definition =>
     definition.kind === 'InputObjectTypeDefinition' &&
     definition.name &&
     definition.name.value === 'Amplify'
  );

  const expectedInputs = getGlobalAmplifyInputEntries().map(item => item.name);
  const inputs = {};
  expectedInputs.map(input => {
    const value = inputDirective?.fields?.find( 
      field => field?.name?.value === input
    ).defaultValue?.value;
    if (_.isEmpty(value)) {
      throw new Error(`Invalid value for ${input} input in the GraphQL schema. Correct and re-try.`);
    }
    inputs[input] = value;
  });

  return inputs;
};

export const validateInputConfig = (config: { [x: string]: any; }) => {
  const expectedInputs = getGlobalAmplifyInputEntries().map(item => item.name);
  const missingInputs = expectedInputs.filter(input => _.isEmpty(config[input]));
  if(!_.isEmpty(missingInputs)) {
    throw new Error(`The input parameters ${missingInputs.join(',')} are missing. Specify them in the schema and re-run.`);
  }
};
