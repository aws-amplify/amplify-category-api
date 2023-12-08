import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when relationshipname is inverse of relation name', () => {
    const schema = readSchema('invalid-relationshipname-not-inverseof-relationname.graphql');
    const errorRegex = 'Relationship name BarFoo conflicts with relationName FooBar. Please change your relationship name';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes validation relationshipname is not inverse of relation name', () => {
    const schema = readSchema('valid-relationshipname-not-inverseof-relationname.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
