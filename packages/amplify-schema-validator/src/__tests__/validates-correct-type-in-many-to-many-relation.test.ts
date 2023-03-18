import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema has incorrect type in many to many relation', () => {
    const schema = readSchema('invalid-correct-type-in-many-to-many-relation.graphql');
    const errorRegex = '@manyToMany relation AmplifyMoodEntryAmplifyActivity expects AmplifyMoodEntry but got AmplifyActivity';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation when schema has correct type in many to many relation', () => {
    const schema = readSchema('valid-correct-type-in-many-to-many-relation.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
