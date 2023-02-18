/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */

import { parse } from 'graphql';
import { validateIndexScalarTypes } from './validators/index-scalar-types';
import { validateRequireBelongsToRelation } from './validators/relation-required-with-belongs-to';
import { validateManyToManyTwoLocations } from './validators/two-many-to-many-locations';
import { validateFieldsMatchInRelatedModel } from './validators/fields-match-in-related-model';
import { ValidationError } from './exceptions/validation-error';
import { validateFieldIsDefinedOnce } from './validators/field-is-defined-once';

const allValidators = [
  validateIndexScalarTypes,
  validateRequireBelongsToRelation,
  validateManyToManyTwoLocations,
  validateFieldsMatchInRelatedModel,
  validateFieldIsDefinedOnce,
];

/**
 * The primary export of this library
 * runs all validators and throws a ValidationException with all failure reasons
 *
 * @param schemaString the graphql schema
 * @returns void
 */
export const validateSchema = (schemaString: string): void => {
  const schema = parse(schemaString);
  const validationErrors = allValidators.flatMap((validate) => validate(schema));
  if (validationErrors.length > 0) {
    const allErrorMessages = validationErrors.map((error: Error) => `${error.name} - ${error.message}`);
    throw new ValidationError(allErrorMessages.join('\n'));
  }
};
