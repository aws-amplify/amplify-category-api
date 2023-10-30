import { print, InputObjectTypeDefinitionNode, DocumentNode } from 'graphql';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';

type AmplifyInputEntry = {
  name: string;
  type: string;
  default: string | number;
  comment?: string | undefined;
};

const getGlobalAmplifyInputEntries = (
  transformerVersion: number,
  dataSourceType = ImportedRDSType.MYSQL,
  includeAuthRule = true,
): AmplifyInputEntry[] => {
  const inputs: AmplifyInputEntry[] = [
    {
      name: 'engine',
      type: 'String',
      default: dataSourceType,
    },
  ];

  if (includeAuthRule && transformerVersion === 2) {
    // need to get from cli core
    // const authDocLink = getGraphQLTransformerAuthDocLink(2);
    const authDocLink = 'doc-link';
    inputs.push({
      name: 'globalAuthRule',
      type: 'AuthRule',
      default: '{ allow: public }',
      comment: `This "input" configures a global authorization rule to enable public access to all models in this schema. Learn more about authorization rules here:${authDocLink}`,
    });
  }
  return inputs;
};

export const constructDefaultGlobalAmplifyInput = (
  transformerVersion: number,
  dataSourceType: ImportedRDSType,
  includeAuthRule = true,
): string => {
  const inputs = getGlobalAmplifyInputEntries(transformerVersion, dataSourceType, includeAuthRule);
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

export const readRDSGlobalAmplifyInput = (schemaDocument: DocumentNode | undefined): InputObjectTypeDefinitionNode | undefined => {
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

export const constructRDSGlobalAmplifyInput = (
  transformerVersion: number,
  config: any,
  schemaDocument: DocumentNode | undefined,
): string => {
  const existingInputNode: any = readRDSGlobalAmplifyInput(schemaDocument);
  if (existingInputNode && existingInputNode?.fields && existingInputNode?.fields?.length > 0) {
    const expectedInputs = getGlobalAmplifyInputEntries(transformerVersion, ImportedRDSType.MYSQL).map((item) => item.name);
    expectedInputs.forEach((input) => {
      const inputNodeField = existingInputNode?.fields?.find((field: any) => field?.name?.value === input);
      if (inputNodeField && config[input]) {
        inputNodeField['defaultValue']['value'] = config[input];
      }
    });
    return print(existingInputNode);
  } else {
    const engine = config['engine'] || ImportedRDSType.MYSQL;
    return constructDefaultGlobalAmplifyInput(transformerVersion, engine, false);
  }
};
