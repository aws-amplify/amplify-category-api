import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has a field defined more than once', () => {
    const schema = readSchema('invalid-enum-is-defined-once.graphql');
    const errorRegex = 'Schema validation failed. Enum value NotificationType.LIKE can only be defined once';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has a field defined once', () => {
    const schema = readSchema('valid-enum-is-defined-once.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
