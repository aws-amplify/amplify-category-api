import { ImportedRDSType } from '../../service-walkthrough-types/import-appsync-api-types';
import { parse } from 'graphql';
import * as fs from 'fs-extra';
import { $TSAny, $TSContext, ApiCategoryFacade, getGraphQLTransformerAuthDocLink } from 'amplify-cli-core';
import _ from 'lodash';

type AmplifyInputEntry = {
  name: string,
  type: string,
  default: string|number,
  comment?: string|undefined
};

const getGlobalAmplifyInputEntries = async (
  context: $TSContext, 
  dataSourceType = ImportedRDSType.MYSQL, 
  includeAuthRule = true
  ): Promise<AmplifyInputEntry[]> => {
  const inputs: AmplifyInputEntry[] = [
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
      default: 3306,
      comment: 'ENTER PORT NUMBER HERE'
    },
    {
      name: 'database',
      type: 'String',
      default: 'ENTER YOUR DATABASE NAME HERE'
    }
  ];

  if (includeAuthRule && (await ApiCategoryFacade.getTransformerVersion(context) === 2)) {
    const authDocLink = getGraphQLTransformerAuthDocLink(2);
    inputs.push({
      name: 'globalAuthRule',
      type: 'AuthRule',
      default: '{ allow: public }',
      comment: `This "input" configures a global authorization rule to enable public access to all models in this schema. Learn more about authorization rules here:${authDocLink}`
    });
  };
  return inputs;
};

export const constructGlobalAmplifyInput = async (context: $TSContext, dataSourceType: ImportedRDSType) => {
  const inputs = await getGlobalAmplifyInputEntries(context, dataSourceType);
  const inputsString = inputs.reduce((acc: string, input): string =>
    acc + ` ${input.name}: ${input.type} = ${input.type === 'String' ? '"'+ input.default + '"' : input.default} ${input.comment ? '# ' + input.comment: ''} \n`
  , '');
  return `input Amplify {\n${inputsString}}\n`;
};

export const readGlobalAmplifyInput = async (context: $TSContext, pathToSchemaFile: string) => {
  const schemaContent = fs.readFileSync(pathToSchemaFile, 'utf-8');
  if(_.isEmpty(schemaContent?.replace(/[\r\n]/gm, ''))) {
    throw new Error('The schema file is empty');
  }

  const parsedSchema = parse(schemaContent);

  const inputDirective: $TSAny = parsedSchema.definitions.find(
    definition =>
     definition.kind === 'InputObjectTypeDefinition' &&
     definition.name &&
     definition.name.value === 'Amplify'
  );

  const expectedInputs = (await getGlobalAmplifyInputEntries(context, ImportedRDSType.MYSQL, false)).map(item => item.name);
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

export const validateInputConfig = async (context: $TSContext, config: { [x: string]: any; }) => {
  const expectedInputs = (await getGlobalAmplifyInputEntries(context, ImportedRDSType.MYSQL, false)).map(item => item.name);
  const missingInputs = expectedInputs.filter(input => _.isEmpty(config[input]));
  if(!_.isEmpty(missingInputs)) {
    throw new Error(`The input parameters ${missingInputs.join(',')} are missing. Specify them in the schema and re-run.`);
  }

  // The database connection details shouldn't have space
  const invalidInputs = expectedInputs.filter(input => config[input]?.indexOf(' ') >= 0);
  if(!_.isEmpty(invalidInputs)) {
    throw new Error(`The database connection parameters ${invalidInputs.join(',')} might be invalid. Correct them in the schema and re-run.`);
  }
};
