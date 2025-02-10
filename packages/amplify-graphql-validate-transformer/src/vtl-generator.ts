import { printBlock, raw } from 'graphql-mapping-template';
import { ValidationRuleConfig, ValidationsByField } from './types';

/**
 * Generates a combined VTL snippet for all validations in a type.
 * @param typeName - The name of the type to generate validations for
 * @param validationsByField - Map of field names to their validation configurations
 * @returns Combined VTL snippet containing all validations for the type
 */
export const generateTypeValidationSnippet = (typeName: string, validationsByField: ValidationsByField): string => {
  const fieldValidationBlocks: string[] = [];

  for (const [fieldName, validations] of Object.entries(validationsByField)) {
    const fieldBlock = generateFieldValidationSnippet(fieldName, validations);
    fieldValidationBlocks.push(fieldBlock);
  }

  // Combine all field validations into a single VTL snippet
  const combinedSnippet = printBlock(`Validations for type ${typeName} **`)(raw(fieldValidationBlocks.join('\n')));
  return combinedSnippet;
};

/**
 * Generates a VTL snippet for all validations for a field.
 * @param fieldName - The name of the field to validate
 * @param validations - Array of validation configurations for the field
 * @returns A VTL code block that performs all validations for the field
 */
export const generateFieldValidationSnippet = (fieldName: string, validations: ValidationRuleConfig[]): string => {
  const validationLines = [`#if( !$util.isNull($ctx.args.input.${fieldName}) )`];

  // Add each validation with its error check
  for (const validation of validations) {
    const { validationType, validationValue, errorMessage } = validation;
    const escapedValue = escapeSingleQuotes(validationValue);
    const escapedErrorMessage = escapeSingleQuotes(errorMessage);
    const validationVar = `${validationType}ValidationPassed`;
    const validationCheck = getValidationCheck(fieldName, validationVar, validationType, escapedValue);

    validationLines.push(`  ${validationCheck}`, `  #if(!$${validationVar})`, `    $util.error('${escapedErrorMessage}')`, '  #end');
  }

  validationLines.push('#end');

  return printBlock(`Validations for field ${fieldName}`)(raw(validationLines.join('\n')));
};

/**
 * Generates a VTL snippet for a validation rule.
 * @param fieldName - The name of the field to validate
 * @param validationVar - The name of the validation variable
 * @param validationType - The type of validation to perform
 * @param value - The value to compare against
 * @returns A VTL code block that performs the validation check
 */
const getValidationCheck = (fieldName: string, validationVar: string, validationType: string, value: string): string => {
  const fieldRef = `$ctx.args.input.${fieldName}`;

  switch (validationType.toLowerCase()) {
    case 'gt':
      return `#set($${validationVar} = ${fieldRef} > ${value})`;
    case 'lt':
      return `#set($${validationVar} = ${fieldRef} < ${value})`;
    case 'gte':
      return `#set($${validationVar} = ${fieldRef} >= ${value})`;
    case 'lte':
      return `#set($${validationVar} = ${fieldRef} <= ${value})`;
    case 'minlength':
      return `#set($${validationVar} = ${fieldRef}.length() >= ${value})`;
    case 'maxlength':
      return `#set($${validationVar} = ${fieldRef}.length() <= ${value})`;
    case 'startswith':
      return `#set($${validationVar} = ${fieldRef}.startsWith('${value}'))`;
    case 'endswith':
      return `#set($${validationVar} = ${fieldRef}.endsWith('${value}'))`;
    case 'matches':
      return `#set($${validationVar} = $util.matches('${value}', ${fieldRef}))`;
    default:
      throw new Error(`Unsupported validation type: ${validationType}`);
  }
};

/**
 * Escapes single quotes in a string for use in VTL templates
 * @param str - The string to escape
 * @returns The escaped string
 */
const escapeSingleQuotes = (str: string): string => {
  return str.replace(/'/g, "''");
};
