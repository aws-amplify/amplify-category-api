import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when ownerfield does not have a string value', () => {
    const schema = readSchema('invalid-owner-field-type-string.graphql');
    const errorRegex = 'String cannot represent a non string value';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when ownerfield has a string value', () => {
    const schema = readSchema('valid-owner-field-type-string.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
