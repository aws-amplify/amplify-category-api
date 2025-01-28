import { NUMERIC_VALIDATION_TYPES, STRING_VALIDATION_TYPES, VALIDATION_TYPES } from '../types';
import {
  NUMERIC_FIELD_TYPES,
  STRING_FIELD_TYPES,
  ALL_FIELD_TYPES,
  runTransformTest,
  createValidationTestCases,
  createValidationSchema,
} from './test-utils';

describe('Validation on Model vs Non-Model Types', () => {
  describe('Disallow validation on non-model type', () => {
    describe('Disallow numeric validations on non-model type', () => {
      const testCases = createValidationTestCases([...NUMERIC_VALIDATION_TYPES], [...NUMERIC_FIELD_TYPES], ['5']);
      test.each(testCases)('rejects `$validationType` validation on `$fieldType` field of non-model type', (testCase) => {
        const schema = /* GraphQL */ `
            type Post @model {
              id: ID!
              input: NonModelInput!
            }

            type NonModelInput {
              field: ${testCase.fieldType}! @validate(type: ${testCase.validationType}, value: "${testCase.value}")
            }
          `;

        runTransformTest(schema, '@validate directive can only be used on fields within @model types');
      });
    });

    describe('Disallow string validations on non-model type', () => {
      test.each([...STRING_VALIDATION_TYPES])('rejects `%s` validation on `String` field of non-model type', (validationType) => {
        const schema = /* GraphQL */ `
            type Post @model {
              id: ID!
              input: NonModelInput!
            }

            type NonModelInput {
              field: String! @validate(type: ${validationType}, value: "test")
            }
          `;

        runTransformTest(schema, '@validate directive can only be used on fields within @model types');
      });
    });
  });

  describe('Allow validation on model type', () => {
    describe('Allow numeric validations on model type', () => {
      const testCases = createValidationTestCases([...NUMERIC_VALIDATION_TYPES], [...NUMERIC_FIELD_TYPES], ['5']);
      test.each(testCases)('accepts `$validationType` validation on `$fieldType` field of model type', (testCase) => {
        const schema = createValidationSchema(testCase);
        runTransformTest(schema);
      });
    });

    describe('Allow string validations on model type', () => {
      const testCases = createValidationTestCases([...STRING_VALIDATION_TYPES], [...STRING_FIELD_TYPES], ['5']);
      test.each(testCases)('accepts `$validationType` validation on `String` field of model type', (testCase) => {
        const schema = createValidationSchema(testCase);
        runTransformTest(schema);
      });
    });
  });
});

describe('Disallow validation on list fields', () => {
  const testCases = createValidationTestCases([...VALIDATION_TYPES], [...ALL_FIELD_TYPES], ['test', '0']);
  test.each(testCases)('rejects `$validationType` validation on list of `$fieldType` field', (testCase) => {
    const schema = createValidationSchema({
      ...testCase,
      fieldType: `[${testCase.fieldType}]`,
    });
    runTransformTest(schema, "@validate directive cannot be used on list field 'field'");
  });
});

describe('Duplicate Validation Types on the same field', () => {
  describe('Disallow duplicate validation types on the same field', () => {
    describe('Disallow duplicate numeric validations on the same field', () => {
      const testCases = createValidationTestCases([...NUMERIC_VALIDATION_TYPES], [...NUMERIC_FIELD_TYPES], ['0'], { fieldName: 'rating' });
      test.each(testCases)('rejects duplicate `$validationType` validation on `$fieldType` field', (testCase) => {
        const schema = /* GraphQL */ `
            type Post @model {
              id: ID!
              rating: ${testCase.fieldType}! @validate(type: ${testCase.validationType}, value: "0") @validate(type: ${testCase.validationType}, value: "1")
            }
          `;
        const error = `Duplicate @validate directive with type '${testCase.validationType}' on field 'rating'. Each validation type can only be used once per field.`;

        runTransformTest(schema, error);
      });
    });

    describe('Disallow duplicate string validations on the same field', () => {
      const testValues = {
        minLength: ['5', '10'],
        maxLength: ['5', '10'],
        startsWith: ['prefix1', 'prefix2'],
        endsWith: ['suffix1', 'suffix2'],
        matches: ['regex1', 'regex2'],
      };

      const testCases = [...STRING_VALIDATION_TYPES].map((type) => ({
        type,
        values: testValues[type],
      }));

      test.each(testCases)('rejects duplicate `$type` validation on `String` field', ({ type, values }) => {
        const schema = /* GraphQL */ `
            type Post @model {
              id: ID!
              title: String! @validate(type: ${type}, value: "${values[0]}") @validate(type: ${type}, value: "${values[1]}")
            }
          `;
        const error = `Duplicate @validate directive with type '${type}' on field 'title'. Each validation type can only be used once per field.`;

        runTransformTest(schema, error);
      });
    });
  });

  describe('Allow non-duplicate validation types on the same field', () => {
    test.each([
      {
        name: 'accepts different validation types on same field',
        schema: /* GraphQL */ `
          type Post @model {
            id: ID!
            title: String! @validate(type: minLength, value: "5") @validate(type: maxLength, value: "10")
            rating: Float! @validate(type: gt, value: "0") @validate(type: lt, value: "6")
            score: Int! @validate(type: gte, value: "10") @validate(type: lte, value: "20")
            description: String!
              @validate(type: startsWith, value: "prefix")
              @validate(type: endsWith, value: "suffix")
              @validate(type: matches, value: "regex")
          }
        `,
      },
    ])('$name', ({ schema }) => {
      runTransformTest(schema);
    });
  });
});

describe('Validation Type Compatibility with Field Type', () => {
  describe('Disallow validation on incompatible fields', () => {
    type FieldType = {
      type: string;
      value: string;
      isObject?: boolean;
    };

    const fieldTypes: FieldType[] = [
      { type: 'String', value: 'test' },
      { type: 'ID', value: 'test-id' },
      { type: 'Boolean', value: 'true' },
      { type: 'Int', value: '5' },
      { type: 'Float', value: '5.0' },
      { type: 'Author', value: 'author-123', isObject: true },
    ];

    const testInvalidFieldTypes = (
      validationTypes: string[],
      allowedTypes: string[],
      errorMessageFn: (type: string, field: FieldType) => string,
    ): void => {
      test.each(
        validationTypes.flatMap((validationType) =>
          fieldTypes
            .filter((fieldType) => !allowedTypes.includes(fieldType.type))
            .map((fieldType) => ({
              validationType,
              fieldType,
            })),
        ),
      )('rejects `$validationType` validation on `$fieldType.type` field', ({ validationType, fieldType }) => {
        const schema = createValidationSchema(
          { validationType, fieldType: fieldType.type, value: fieldType.value },
          fieldType.isObject
            ? /* GraphQL */ `
                type Author @model {
                  id: ID!
                  name: String!
                }
              `
            : undefined,
        );
        runTransformTest(schema, errorMessageFn(validationType, fieldType));
      });
    };

    describe('Disallow numeric validations on non-numeric fields', () => {
      testInvalidFieldTypes(
        [...NUMERIC_VALIDATION_TYPES],
        [...NUMERIC_FIELD_TYPES],
        (validationType, fieldType) =>
          `Validation type '${validationType}' can only be used with numeric fields (Int, Float). Field 'field' is of type '${fieldType.type}'`,
      );
    });

    describe('Disallow string validations on non-string fields', () => {
      testInvalidFieldTypes(
        [...STRING_VALIDATION_TYPES],
        [...STRING_FIELD_TYPES],
        (validationType, fieldType) =>
          `Validation type '${validationType}' can only be used with 'String' fields. Field 'field' is of type '${fieldType.type}'`,
      );
    });
  });

  describe('Allow validations on compatible fields', () => {
    describe('Allow numeric validations on numeric fields', () => {
      const testCases = createValidationTestCases([...NUMERIC_VALIDATION_TYPES], [...NUMERIC_FIELD_TYPES], ['100']);
      test.each(testCases)('accepts `$validationType` validation on `$fieldType` field with value `$value`', (testCase) => {
        const schema = createValidationSchema(testCase);
        runTransformTest(schema);
      });
    });

    describe('Allow string validations on string fields', () => {
      const testCases = createValidationTestCases([...STRING_VALIDATION_TYPES], [...STRING_FIELD_TYPES], ['5']);
      test.each(testCases)('accepts `$validationType` validation on `$fieldType` field with value `$value`', (testCase) => {
        const schema = createValidationSchema(testCase);
        runTransformTest(schema);
      });
    });
  });
});

describe('Directive order enforcement for @validate and @default', () => {
  type DirectiveOrderTestCase = {
    name: string;
    directives: string[];
    shouldPass: boolean;
  };
  
  const createDirectiveOrderSchema = (directives: string[]): string => {
    const directiveString = directives.join(' ');
    return /* GraphQL */ `
      type Post @model {
        id: ID!
        title: String! ${directiveString}
      }
    `;
  };

  const testCases: DirectiveOrderTestCase[] = [
    {
      name: 'rejects "@validate @default" ordering',
      directives: ['@validate(type: minLength, value: "5")', '@default(value: "default")'],
      shouldPass: false,
    },
    {
      name: 'rejects "@validate @default @validate" ordering',
      directives: ['@validate(type: minLength, value: "5")', '@default(value: "default")', '@validate(type: maxLength, value: "10")'],
      shouldPass: false,
    },
    {
      name: 'rejects "@validate @validate @default" ordering',
      directives: ['@validate(type: minLength, value: "5")', '@validate(type: maxLength, value: "10")', '@default(value: "default")'],
      shouldPass: false,
    },
    {
      name: 'rejects "@validate @validate @validate @validate @validate @default" ordering',
      directives: [
        '@validate(type: minLength, value: "5")',
        '@validate(type: maxLength, value: "10")',
        '@validate(type: startsWith, value: "prefix")',
        '@validate(type: endsWith, value: "suffix")',
        '@validate(type: matches, value: "regex")',
        '@default(value: "default")',
      ],
      shouldPass: false,
    },
    {
      name: 'accepts "@default @validate" ordering',
      directives: ['@default(value: "default")', '@validate(type: minLength, value: "5")'],
      shouldPass: true,
    },
    {
      name: 'accepts "@default @validate @validate" ordering',
      directives: ['@default(value: "default")', '@validate(type: minLength, value: "5")', '@validate(type: maxLength, value: "10")'],
      shouldPass: true,
    },
    {
      name: 'accepts "@default @validate @validate @validate @validate @validate" ordering',
      directives: [
        '@default(value: "default")',
        '@validate(type: minLength, value: "5")',
        '@validate(type: maxLength, value: "10")',
        '@validate(type: startsWith, value: "prefix")',
        '@validate(type: endsWith, value: "suffix")',
        '@validate(type: matches, value: "regex")',
      ],
      shouldPass: true,
    },
  ];

  test.each(testCases)('$name', ({ directives, shouldPass }) => {
    const schema = createDirectiveOrderSchema(directives);
    if (shouldPass) {
      runTransformTest(schema);
    } else {
      runTransformTest(schema, '@validate directive must be specified after @default directive');
    }
  });
});
