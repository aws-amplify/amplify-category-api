import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { DocumentNode, InputObjectTypeDefinitionNode, print } from 'graphql';

type AmplifyInputEntry = {
  name: string;
  type: string;
  default: string | number;
  comment?: string | undefined;
};

const getGlobalAmplifyInputEntries = (
  dataSourceType = ImportedRDSType.MYSQL,
  includeAuthRule = true,
  authDocLink?: string,
): AmplifyInputEntry[] => {
  const inputs: AmplifyInputEntry[] = [
    {
      name: 'engine',
      type: 'String',
      default: dataSourceType,
    },
  ];

  if (includeAuthRule) {
    inputs.push({
      name: 'globalAuthRule',
      type: 'AuthRule',
      default: '{ allow: public }',
      comment:
        'This "input" configures a global authorization rule to enable public access to all models in this schema.' +
        (!!authDocLink ? ` Learn more about authorization rules here:${authDocLink}` : ''),
    });
  }
  return inputs;
};

export const constructDefaultGlobalAmplifyInput = (
  dataSourceType: ImportedRDSType,
  includeAuthRule = true,
  authDocLink?: string,
): string => {
  const inputs = getGlobalAmplifyInputEntries(dataSourceType, includeAuthRule, authDocLink);
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

export const constructRDSGlobalAmplifyInput = (config: any, schemaDocument: DocumentNode | undefined): string => {
  const existingInputNode: any = readRDSGlobalAmplifyInput(schemaDocument);
  if (existingInputNode && existingInputNode?.fields && existingInputNode?.fields?.length > 0) {
    const expectedInputs = getGlobalAmplifyInputEntries(ImportedRDSType.MYSQL).map((item) => item.name);
    expectedInputs.forEach((input) => {
      const inputNodeField = existingInputNode?.fields?.find((field: any) => field?.name?.value === input);
      if (inputNodeField && config[input]) {
        inputNodeField['defaultValue']['value'] = config[input];
      }
    });
    return print(existingInputNode);
  } else {
    const engine = config['engine'] || ImportedRDSType.MYSQL;
    return constructDefaultGlobalAmplifyInput(engine, false);
  }
};
