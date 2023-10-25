import { print, InputObjectTypeDefinitionNode, DocumentNode, StringValueNode } from 'graphql';
import * as fs from 'fs-extra';
import { $TSContext, ApiCategoryFacade, getGraphQLTransformerAuthDocLink } from '@aws-amplify/amplify-cli-core';
import _ from 'lodash';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';

type AmplifyInputEntry = {
  name: string;
  type: string;
  default: string | number;
  comment?: string | undefined;
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
    },
  ];

  if (includeAuthRule && (await ApiCategoryFacade.getTransformerVersion(context)) === 2) {
    const authDocLink = getGraphQLTransformerAuthDocLink(2);
    inputs.push({
      name: 'globalAuthRule',
      type: 'AuthRule',
      default: '{ allow: public }',
      comment: `This "input" configures a global authorization rule to enable public access to all models in this schema. Learn more about authorization rules here:${authDocLink}`,
    });
  }
  return inputs;
};

export const constructDefaultGlobalAmplifyInput = async (
  context: $TSContext,
  dataSourceType: ImportedRDSType,
  includeAuthRule: boolean = true,
) => {
  const inputs = await getGlobalAmplifyInputEntries(context, dataSourceType, includeAuthRule);
  const inputsString = inputs.reduce(
    (acc: string, input): string =>
      acc +
      ` ${input.name}: ${input.type} = ${input.type === 'String' ? '"' + input.default + '"' : input.default} ${
        input.comment ? '# ' + input.comment : ''
      } \n`,
    '',
  );
  return `input AMPLIFY {\n${inputsString}}\n`;
};

export const readRDSGlobalAmplifyInput = async (
  schemaDocument: DocumentNode | undefined,
): Promise<InputObjectTypeDefinitionNode | undefined> => {
  if (!schemaDocument) {
    return;
  }
  const inputNode = schemaDocument.definitions.find(
    (definition) => definition.kind === 'InputObjectTypeDefinition' && definition.name && definition.name.value === 'AMPLIFY',
  );

  if (inputNode) {
    return inputNode as InputObjectTypeDefinitionNode;
  }
};

export const readRDSSchema = async (pathToSchemaFile: string): Promise<string | undefined> => {
  if (!fs.existsSync(pathToSchemaFile)) {
    return;
  }
  const schemaContent = fs.readFileSync(pathToSchemaFile, 'utf-8');
  if (_.isEmpty(schemaContent)) {
    return;
  }
  return schemaContent;
};

export const constructRDSGlobalAmplifyInput = async (
  context: $TSContext,
  config: any,
  schemaDocument: DocumentNode | undefined,
): Promise<string> => {
  const existingInputNode: any = await readRDSGlobalAmplifyInput(schemaDocument);
  if (existingInputNode && existingInputNode?.fields && existingInputNode?.fields?.length > 0) {
    const expectedInputs = (await getGlobalAmplifyInputEntries(context, ImportedRDSType.MYSQL)).map((item) => item.name);
    expectedInputs.forEach((input) => {
      const inputNodeField = existingInputNode?.fields?.find((field: any) => field?.name?.value === input);
      if (inputNodeField && config[input]) {
        inputNodeField['defaultValue']['value'] = config[input];
      }
    });
    return print(existingInputNode);
  } else {
    const engine = config['engine'] || ImportedRDSType.MYSQL;
    return constructDefaultGlobalAmplifyInput(context, engine, false);
  }
};

export const getEngineInput = async (schemaDocument: DocumentNode): Promise<ImportedRDSType> => {
  const inputNode = await readRDSGlobalAmplifyInput(schemaDocument);
  if (inputNode) {
    const engine = (inputNode.fields.find((field) => field.name.value === 'engine')?.defaultValue as StringValueNode)?.value;
    if (engine && !Object.values(ImportedRDSType).includes(engine as ImportedRDSType)) {
      throw new Error(`engine input ${engine} is not supported.`);
    }
    return engine as ImportedRDSType;
  }
  return ImportedRDSType.MYSQL;
};
