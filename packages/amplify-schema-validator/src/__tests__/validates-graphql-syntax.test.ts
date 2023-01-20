import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when schema is not valid graphql', () => {
    const schema = 'asf';
    const errorRegex = 'Syntax Error';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('fails validation when schema is empty', () => {
    const schema = readSchema('invalid-empty-schema.graphql');
    const errorRegex = 'Syntax Error';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });
});
