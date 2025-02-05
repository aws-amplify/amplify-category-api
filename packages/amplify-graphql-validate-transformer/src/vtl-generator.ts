import { printBlock, raw } from 'graphql-mapping-template';

/**
 * Escapes single quotes in a string for use in VTL templates
 * @param str - The string to escape
 * @returns The escaped string
 */
const escapeSingleQuotes = (str: string): string => {
  return str.replace(/'/g, "''");
};

/**
 * Generates a VTL snippet for field validation.
 * @param fieldName - The name of the field to validate
 * @param validationType - The type of validation to perform
 * @param validationValue - The value to validate against
 * @param errorMessage - The error message to display if validation fails
 * @returns A VTL code block that performs the validation check and throws an error if validation fails
 */
export const makeValidationSnippet = (fieldName: string, validationType: string, validationValue: string, errorMessage: string): string => {
  const validationCheck = getValidationCheck(fieldName, validationType, validationValue);
  const escapedErrorMessage = escapeSingleQuotes(errorMessage);

  const template = [
    '#if( !$util.isNull($ctx.args.input.' + fieldName + ') )',
    '  ' + validationCheck,
    '  #if(!$validationPassed)',
    "    $util.error('" + escapedErrorMessage + "')",
    '  #end',
    '#end',
  ].join('\n');

  return printBlock(`Validating "${fieldName}" with type "${validationType}" and value "${validationValue}"`)(raw(template));
};

const getValidationCheck = (fieldName: string, validationType: string, value: string): string => {
  const fieldRef = `$ctx.args.input.${fieldName}`;

  switch (validationType.toLowerCase()) {
    case 'gt':
      return `#set($validationPassed = ${fieldRef} > ${value})`;
    case 'lt':
      return `#set($validationPassed = ${fieldRef} < ${value})`;
    case 'gte':
      return `#set($validationPassed = ${fieldRef} >= ${value})`;
    case 'lte':
      return `#set($validationPassed = ${fieldRef} <= ${value})`;
    case 'minlength':
      return `#set($validationPassed = ${fieldRef}.length() >= ${value})`;
    case 'maxlength':
      return `#set($validationPassed = ${fieldRef}.length() <= ${value})`;
    case 'startswith':
      return `#set($validationPassed = ${fieldRef}.startsWith("${value}"))`;
    case 'endswith':
      return `#set($validationPassed = ${fieldRef}.endsWith("${value}"))`;
    case 'matches':
      return `#set($validationPassed = $util.matches("${value}", ${fieldRef}))`;
    default:
      throw new Error(`Unsupported validation type: ${validationType}`);
  }
};
