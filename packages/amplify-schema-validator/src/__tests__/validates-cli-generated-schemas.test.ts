import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('successfully validates CLI-generated todo schema', () => {
    const schema = readSchema('valid-todo-schema.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });

  it('successfully validates CLI-generated blog schema', () => {
    const schema = readSchema('valid-blog-schema.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });

  it('successfully validates CLI-generated blank schema', () => {
    const schema = readSchema('valid-blank-schema.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
