import { parse, print, InputObjectTypeDefinitionNode } from 'graphql';
import * as fs from 'fs-extra';
import {
  $TSAny,
  $TSContext,
  ApiCategoryFacade,
  getGraphQLTransformerAuthDocLink,
} from '@aws-amplify/amplify-cli-core';
import _ from 'lodash';
import { ImportedRDSType, ImportedDataSourceConfig } from '../types/import-appsync-api-types';

type AmplifyInputEntry = {
  name: string,
  type: string,
  default: string|number,
  comment?: string|undefined
};

const getGlobalAmplifyInputEntries = async (
  context: $TSContext,
  dataSourceType = ImportedRDSType.MYSQL,
  includeAuthRule = true,
): Promise<AmplifyInputEntry[]> => {
  const inputs: AmplifyInputEntry[] = [
    {
      name: 'engine',
      type: 'String',
      default: dataSourceType,
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

export const constructDefaultGlobalAmplifyInput = async (context: $TSContext, dataSourceType: ImportedRDSType, includeAuthRule: boolean = true) => {
  const inputs = await getGlobalAmplifyInputEntries(context, dataSourceType, includeAuthRule);
  const inputsString = inputs.reduce((acc: string, input): string =>
    acc + ` ${input.name}: ${input.type} = ${input.type === 'String' ? '"'+ input.default + '"' : input.default} ${input.comment ? '# ' + input.comment: ''} \n`
  , '');
  return `input Amplify {\n${inputsString}}\n`;
};

export const readRDSGlobalAmplifyInput = async (pathToSchemaFile: string): Promise<InputObjectTypeDefinitionNode | undefined> => {
  if (!fs.existsSync(pathToSchemaFile)) {
    return;
  }
  const schemaContent = fs.readFileSync(pathToSchemaFile, 'utf-8');
  if (_.isEmpty(schemaContent?.replace(/[\r\n]/gm, ''))) {
    return;
  }

  const parsedSchema = parse(schemaContent);

  const inputNode = parsedSchema.definitions.find(
    (definition) =>
      definition.kind === 'InputObjectTypeDefinition' &&
      definition.name &&
      definition.name.value === 'Amplify'
  );

  if (inputNode) {
    return (inputNode as InputObjectTypeDefinitionNode);
  }
};

export const getRDSDBConfigFromAmplifyInput = async (context:$TSContext, inputNode: $TSAny): Promise<Partial<ImportedDataSourceConfig>> => {
  const expectedInputs = (await getGlobalAmplifyInputEntries(context, ImportedRDSType.MYSQL, false)).map(item => item.name);
  const inputs: $TSAny = {};
  expectedInputs.map((input) => {
    const value = inputNode?.fields?.find(
      (field: $TSAny) => field?.name?.value === input,
    )?.defaultValue?.value;
    if (_.isEmpty(value)) {
      throw new Error(`Invalid value for ${input} input in the GraphQL schema. Correct and re-try.`);
    }
    inputs[input] = value;
  });
  return inputs;
};

export const constructRDSGlobalAmplifyInput = async (context: $TSContext, config: $TSAny, pathToSchemaFile: string): Promise<string> => {
  const existingInputNode:$TSAny = await readRDSGlobalAmplifyInput(pathToSchemaFile) || {};
  if ( existingInputNode?.fields && existingInputNode?.fields?.length > 0 ) {
    const expectedInputs = (await getGlobalAmplifyInputEntries(context, ImportedRDSType.MYSQL)).map(item => item.name);
    expectedInputs.forEach((input) => {
      const inputNodeField = existingInputNode?.fields?.find(
        (field: $TSAny) => field?.name?.value === input,
      );
      if (inputNodeField && config[input]) {
        inputNodeField['defaultValue']['value'] = config[input];
      }
    });
    return print(existingInputNode);
  }
  else {
    const engine = config['engine'] || ImportedRDSType.MYSQL;
    return constructDefaultGlobalAmplifyInput(context, engine, false);
  }
};

export const isGlobalAuthRulePresent = (inputNode: InputObjectTypeDefinitionNode) => {
  const authRuleField = inputNode?.fields?.find(
    (field: $TSAny) => field?.name?.value === "globalAuthRule",
  );
  return authRuleField ? true : false;
};

export const removeAmplifyInputDefinition = (schema: string): string => {
  if (_.isEmpty(schema)) {
    return schema;
  }

  const parsedSchema: $TSAny = parse(schema);

  parsedSchema.definitions = parsedSchema?.definitions?.filter(
    (definition: $TSAny) =>
      !(definition?.kind === 'InputObjectTypeDefinition' &&
      definition?.name &&
      definition?.name?.value === 'Amplify')
  );

  const sanitizedSchema = print(parsedSchema);
  return sanitizedSchema;
};
