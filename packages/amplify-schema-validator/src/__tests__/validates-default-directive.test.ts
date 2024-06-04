import { validateSchema } from '..';
import { readSchema } from './helpers/readSchema';

describe('Validate Schema', () => {
  it('fails validation when @default directive is not added to object definitions annotated with @model', () => {
    const schema = readSchema('invalid-default-directive1.graphql');
    const errorRegex = 'InvalidDirectiveError - The @default directive may only be added to object definitions annotated with @model.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('fails validation when @default directive is not added to scalar or enum field types', () => {
    const schema = readSchema('invalid-default-directive2.graphql');
    const errorRegex = 'InvalidDirectiveError - The @default directive may only be added to scalar or enum field types.';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('fails validation when @default directive has more than a value property', () => {
    const schema = readSchema('invalid-default-directive3.graphql');
    const errorRegex = 'InvalidDirectiveError - The @default directive only takes a value property';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('fails validation when @default directives value property does not have a string value', () => {
    const schema = readSchema('invalid-default-directive4.graphql');
    const errorRegex = 'InvalidDirectiveError - String cannot represent a non string value: the @default directive has a non String value';
    expect(() => validateSchema(schema)).toThrow(errorRegex);
  });

  it('passes @default directive validations', () => {
    const schema = readSchema('valid-default-directive.graphql');
    expect(() => validateSchema(schema)).not.toThrow();
  });
});
