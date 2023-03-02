/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */

import { parse } from 'graphql';
import { validateIndexScalarTypes } from './validators/index-scalar-types';
import { validateRequireBelongsToRelation } from './validators/relation-required-with-belongs-to';
import { validateManyToManyTwoLocations } from './validators/two-many-to-many-locations';
import { validateFieldsMatchInParentModel } from './validators/fields-match-in-parent-model';
import { ValidationError } from './exceptions/validation-error';
import { validateFieldIsDefinedOnce } from './validators/field-is-defined-once';
import { validateTypeIsDefinedOnce } from './validators/type-is-defined-once';
import { validateIndexIsDefinedOnce } from './validators/index-is-defined-once-in-model';
import { validateIndexExistsInRelatedModel } from './validators/index-exists-in-related-model';
import { validateEnumIsDefinedOnce } from './validators/enum-is-defined-once';
import { validateKeyExistsInRelatedModel } from './validators/key-exists-in-related-model';

const allValidators = [
  validateIndexScalarTypes,
  validateRequireBelongsToRelation,
  validateManyToManyTwoLocations,
  validateFieldIsDefinedOnce,
  validateTypeIsDefinedOnce,
  validateIndexIsDefinedOnce,
  validateFieldsMatchInParentModel,
  validateIndexExistsInRelatedModel,
  validateEnumIsDefinedOnce,
  validateKeyExistsInRelatedModel,
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
