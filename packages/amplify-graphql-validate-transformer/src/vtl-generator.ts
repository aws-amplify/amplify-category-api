import { printBlock, raw } from 'graphql-mapping-template';

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

  return printBlock(`Validating "${fieldName}" with type "${validationType}" and value "${validationValue}"`)(
    raw(`#if( !$util.isNull($ctx.args.input.${fieldName}) )
      ${validationCheck}
      #if(!$validationPassed)
        $util.error("${errorMessage}")
      #end
    #end`),
  );
};

const getValidationCheck = (fieldName: string, validationType: string, value: string): string => {
  const fieldRef = `$ctx.args.input.${fieldName}`;

  switch (validationType.toLowerCase()) {
    case 'gt':
      return `#set($validationPassed = $${fieldRef} > ${value})`;
    case 'lt':
      return `#set($validationPassed = $${fieldRef} < ${value})`;
    case 'gte':
      return `#set($validationPassed = $${fieldRef} >= ${value})`;
    case 'lte':
      return `#set($validationPassed = $${fieldRef} <= ${value})`;
    case 'minlength':
      return `#set($validationPassed = $${fieldRef}.length() >= ${value})`;
    case 'maxlength':
      return `#set($validationPassed = $${fieldRef}.length() <= ${value})`;
    case 'startswith':
      return `#set($validationPassed = $${fieldRef}.startsWith("${value}"))`;
    case 'endswith':
      return `#set($validationPassed = $${fieldRef}.endsWith("${value}"))`;
    case 'matches':
      return `#set($validationPassed = $util.matches($${fieldRef}, "${value}"))`;
    default:
      throw new Error(`Unsupported validation type: ${validationType}`);
  }
};
