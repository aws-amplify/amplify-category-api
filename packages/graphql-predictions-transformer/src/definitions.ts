import {
  InputValueDefinitionNode, InputObjectTypeDefinitionNode, Kind, FieldDefinitionNode,
} from 'graphql';
import { makeNamedType, makeNonNullType, makeListType } from 'graphql-transformer-common';

function inputValueDefinition(inputValue: string, namedType: string, isNonNull = false): InputValueDefinitionNode {
  return {
    kind: Kind.INPUT_VALUE_DEFINITION,
    name: { kind: 'Name' as const, value: inputValue },
    type: isNonNull ? makeNonNullType(makeNamedType(namedType)) : makeNamedType(namedType),
    directives: [],
  };
}

/**
 *
 * @param str
 */
export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 *
 * @param action
 * @param fieldName
 */
export function getActionInputName(action: string, fieldName: string) {
  return `${capitalizeFirstLetter(fieldName)}${capitalizeFirstLetter(action)}Input`;
}

/**
 *
 * @param fieldName
 * @param fields
 */
export function makeActionInputObject(fieldName: string, fields: InputValueDefinitionNode[]): InputObjectTypeDefinitionNode {
  return {
    kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
    name: { kind: 'Name' as const, value: `${capitalizeFirstLetter(fieldName)}Input` },
    fields,
    directives: [],
  };
}

/**
 *
 * @param action
 * @param fieldName
 * @param isFirst
 */
export function getActionInputType(action: string, fieldName: string, isFirst = false): InputObjectTypeDefinitionNode {
  const actionInputFields: { [action: string]: InputValueDefinitionNode[] } = {
    identifyText: [inputValueDefinition('key', 'String', true)],
    identifyLabels: [inputValueDefinition('key', 'String', true)],
    translateText: [
      inputValueDefinition('sourceLanguage', 'String', true),
      inputValueDefinition('targetLanguage', 'String', true),
      ...(isFirst ? [inputValueDefinition('text', 'String', true)] : []),
    ],
    convertTextToSpeech: [
      inputValueDefinition('voiceID', 'String', true),
      ...(isFirst ? [inputValueDefinition('text', 'String', true)] : []),
    ],
  };
  return {
    kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
    name: { kind: 'Name', value: getActionInputName(action, fieldName) },
    fields: actionInputFields[action],
    directives: [],
  };
}

/**
 *
 * @param field
 * @param fieldName
 * @param isList
 */
export function addInputArgument(field: FieldDefinitionNode, fieldName: string, isList: boolean): FieldDefinitionNode {
  return {
    ...field,
    arguments: [
      {
        kind: Kind.INPUT_VALUE_DEFINITION,
        name: { kind: 'Name' as const, value: 'input' },
        type: makeNonNullType(makeNamedType(`${capitalizeFirstLetter(fieldName)}Input`)),
        directives: [],
      },
    ],
    type: isList ? makeListType(makeNamedType('String')) : makeNamedType('String'),
  };
}

/**
 *
 * @param action
 * @param fieldName
 */
export function createInputValueAction(action: string, fieldName: string): InputValueDefinitionNode {
  return {
    kind: Kind.INPUT_VALUE_DEFINITION,
    name: { kind: 'Name' as const, value: `${action}` },
    type: makeNonNullType(makeNamedType(getActionInputName(action, fieldName))),
    directives: [],
  };
}
