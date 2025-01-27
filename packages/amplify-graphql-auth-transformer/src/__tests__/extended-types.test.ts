import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AppSyncAuthConfiguration } from '@aws-amplify/graphql-transformer-interfaces';
import { DocumentNode, FieldDefinitionNode, Kind, ObjectTypeDefinitionNode, parse } from 'graphql';
import { AuthTransformer } from '../graphql-auth-transformer';

describe('@auth directive on extended types', () => {
  const authConfig: AppSyncAuthConfiguration = {
    defaultAuthentication: {
      authenticationType: 'AMAZON_COGNITO_USER_POOLS',
    },
    additionalAuthenticationProviders: [{ authenticationType: 'AWS_IAM' }],
  };

  const getObjectType = (doc: DocumentNode, type: string): ObjectTypeDefinitionNode | undefined => {
    return doc.definitions.find((def) => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === type) as
      | ObjectTypeDefinitionNode
      | undefined;
  };

  const expectNoDirectives = (fieldOrType: ObjectTypeDefinitionNode | FieldDefinitionNode | undefined): void => {
    expect(fieldOrType?.directives?.length).toEqual(0);
  };

  const expectOneDirective = (fieldOrType: ObjectTypeDefinitionNode | FieldDefinitionNode | undefined, directiveName: string): void => {
    expect(fieldOrType?.directives?.length).toEqual(1);
    expect(fieldOrType?.directives?.find((d) => d.name.value === directiveName)).toBeDefined();
  };

  const expectDirectiveWithName = (
    fieldOrType: ObjectTypeDefinitionNode | FieldDefinitionNode | undefined,
    directiveName: string,
  ): void => {
    expect(fieldOrType?.directives?.find((d) => d.name.value === directiveName)).toBeDefined();
  };

  const getField = (type: ObjectTypeDefinitionNode | undefined, name: string): FieldDefinitionNode | undefined =>
    type?.fields?.find((f) => f.name.value === name);

  test('supports @auth directive on a type that has been extended', () => {
    const schema = /* GraphQL */ `
      type Todo @model @auth(rules: [{ allow: public, provider: iam }]) {
        id: ID!
        description: String
      }

      extend type Todo {
        extendedField: String!
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    };

    const out = testTransform(testTransformParams);
    expect(out).toBeDefined();

    const transformedSchema = out.schema;
    const doc = parse(transformedSchema);

    const todoType = getObjectType(doc, 'Todo');
    expect(todoType).toBeDefined();
    expectDirectiveWithName(todoType, 'aws_iam');
  });

  test('does not support @auth directive on the model type extension itself', () => {
    const schema = /* GraphQL */ `
      type Todo @model {
        id: ID!
        description: String
      }

      extend type Todo @auth(rules: [{ allow: public, provider: iam }]) {
        extendedField: String!
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    };

    expect(() => testTransform(testTransformParams)).toThrow(
      "Directives are not supported on object or interface extensions. See the '@auth' directive on 'Todo'",
    );
  });

  test('does not support @auth directive on fields of model type extensions', () => {
    const schema = /* GraphQL */ `
      type Todo @model {
        id: ID!
        description: String
      }

      extend type Todo @auth(rules: [{ allow: public, provider: iam }]) {
        extendedField: String!
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    };

    expect(() => testTransform(testTransformParams)).toThrow(
      "Directives are not supported on object or interface extensions. See the '@auth' directive on 'Todo'",
    );
  });

  test.each(['Query', 'Mutation', 'Subscription'])('supports @auth directive on fields of %s type extensions', (builtInType: string) => {
    const schema = /* GraphQL */ `
      type ${builtInType} {
        customOperation1: String! @auth(rules: [{ allow: public, provider: iam }])
      }

      extend type ${builtInType} {
        customOperation2: String! @auth(rules: [{ allow: public, provider: iam }])
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new AuthTransformer()],
    };

    const out = testTransform(testTransformParams);
    expect(out).toBeDefined();

    const transformedSchema = out.schema;
    const doc = parse(transformedSchema);

    const operationType = getObjectType(doc, builtInType);
    expect(operationType).toBeDefined();
    expectNoDirectives(operationType!);
    expectOneDirective(getField(operationType, 'customOperation1'), 'aws_iam');
    expectOneDirective(getField(operationType, 'customOperation2'), 'aws_iam');
  });

  test.each(['Query', 'Mutation', 'Subscription'])(
    'does not support @auth directive on %s object extension itself',
    (builtInType: string) => {
      const schema = /* GraphQL */ `
        type ${builtInType} {
          customOperation1: String! @auth(rules: [{ allow: public, provider: iam }])
        }

        extend type ${builtInType} @auth(rules: [{ allow: public, provider: iam }]) {
          customOperation2: String! 
        }
      `;

      const testTransformParams = {
        schema: schema,
        authConfig,
        transformers: [new AuthTransformer()],
      };

      expect(() => testTransform(testTransformParams)).toThrow(
        `Directives are not supported on object or interface extensions. See the '@auth' directive on '${builtInType}'`,
      );
    },
  );

  test('does not support @auth directive on fields of non-model type extensions', () => {
    const schema = /* GraphQL */ `
      type Foo {
        customField1: String! @auth(rules: [{ allow: public, provider: iam }])
      }

      extend type Foo {
        customField2: String! @auth(rules: [{ allow: public, provider: iam }])
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new AuthTransformer()],
    };

    expect(() => testTransform(testTransformParams)).toThrow(
      "The '@auth' directive cannot be used on fields of type extensions other than 'Query', 'Mutation', and 'Subscription'. See Foo.customField2",
    );
  });

  test('supports @aws_ directives on model types', () => {
    const schema = /* GraphQL */ `
      type Todo @model @auth(rules: [{ allow: public, provider: iam }]) {
        id: ID!
        description: String
      }

      extend type Todo {
        extendedField: String! @aws_cognito_user_pools
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new ModelTransformer(), new AuthTransformer()],
    };

    const out = testTransform(testTransformParams);
    expect(out).toBeDefined();

    const transformedSchema = out.schema;
    const doc = parse(transformedSchema);

    const todoType = getObjectType(doc, 'Todo');
    expect(todoType).toBeDefined();

    const extendedField = todoType?.fields?.find((f) => f.name.value === 'extendedField');
    expectDirectiveWithName(extendedField, 'aws_cognito_user_pools');
  });

  test('does not support duplicate field names on Query extensions', () => {
    const schema = /* GraphQL */ `
      type Query {
        customField1: String! @auth(rules: [{ allow: public, provider: iam }])
      }

      extend type Query {
        customField1: Int @auth(rules: [{ allow: public, provider: iam }])
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new AuthTransformer()],
    };

    expect(() => testTransform(testTransformParams)).toThrow("Object type extension 'Query' cannot redeclare field customField1");
  });

  test('does not support duplicate field names on @model type extensions', () => {
    const schema = /* GraphQL */ `
      type Todo @model @auth(rules: [{ allow: public, provider: iam }]) {
        id: ID!
        description: String
      }

      extend type Todo {
        description: Int
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new AuthTransformer()],
    };

    expect(() => testTransform(testTransformParams)).toThrow("Object type extension 'Todo' cannot redeclare field description");
  });

  test('does not support duplicate field names on non-model type extensions', () => {
    const schema = /* GraphQL */ `
      type Foo {
        id: ID!
        description: String
      }

      extend type Foo {
        description: Int
      }
    `;

    const testTransformParams = {
      schema: schema,
      authConfig,
      transformers: [new AuthTransformer()],
    };

    expect(() => testTransform(testTransformParams)).toThrow("Object type extension 'Foo' cannot redeclare field description");
  });
});
