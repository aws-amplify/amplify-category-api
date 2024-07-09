import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { validateImportedTableMap } from '../../internal/imported-tables';

describe('imported-tables', () => {
  describe('validateImportedTableMap', () => {
    test('no errors on no map', () => {
      const definition = AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model {
          description: String!
        }
      `);
      expect(() => validateImportedTableMap(definition)).not.toThrow();
    });

    test('no errors on empty map without imported strategy', () => {
      const definition = AmplifyGraphqlDefinition.fromString(/* GraphQL */ `
        type Todo @model {
          description: String!
        }
      `);
      expect(() => validateImportedTableMap(definition, {})).not.toThrow();
    });

    test('no errors on valid map', () => {
      const definition = AmplifyGraphqlDefinition.fromString(
        /* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `,
        {
          dbType: 'DYNAMODB',
          provisionStrategy: 'IMPORTED_AMPLIFY_TABLE',
        },
      );
      const tableMap = {
        Todo: 'Todo-123-dev',
      };
      expect(() => validateImportedTableMap(definition, tableMap)).not.toThrow();
    });

    test('errors when model is missing in map', () => {
      const definition = AmplifyGraphqlDefinition.fromString(
        /* GraphQL */ `
          type Todo @model {
            description: String!
          }

          type NotTodo @model {
            description: String!
          }

          type Bar @model {
            description: String!
          }
        `,
        {
          dbType: 'DYNAMODB',
          provisionStrategy: 'IMPORTED_AMPLIFY_TABLE',
        },
      );
      const tableMap = {
        Todo: 'Todo-123-dev',
      };
      expect(() => validateImportedTableMap(definition, tableMap)).toThrow(
        'Cannot find imported Amplify DynamoDB table mapping for models NotTodo, Bar.',
      );
    });

    test('errors when model is missing in schema', () => {
      const definition = AmplifyGraphqlDefinition.fromString(
        /* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `,
        {
          dbType: 'DYNAMODB',
          provisionStrategy: 'IMPORTED_AMPLIFY_TABLE',
        },
      );
      const tableMap = {
        Todo: 'Todo-123-dev',
        NotTodo: 'NotTodo-123-dev',
        Bar: 'Bar-123-dev',
      };
      expect(() => validateImportedTableMap(definition, tableMap)).toThrow(
        'Table mapping includes tables not specified as imported in schema. (NotTodo, Bar)',
      );
    });

    test('errors on empty map with imported strategy', () => {
      const definition = AmplifyGraphqlDefinition.fromString(
        /* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `,
        {
          dbType: 'DYNAMODB',
          provisionStrategy: 'IMPORTED_AMPLIFY_TABLE',
        },
      );
      const tableMap = {};
      expect(() => validateImportedTableMap(definition, tableMap)).toThrow(
        'Cannot find imported Amplify DynamoDB table mapping for models Todo.',
      );
    });

    test('errors on missing map with imported strategy', () => {
      const definition = AmplifyGraphqlDefinition.fromString(
        /* GraphQL */ `
          type Todo @model {
            description: String!
          }
        `,
        {
          dbType: 'DYNAMODB',
          provisionStrategy: 'IMPORTED_AMPLIFY_TABLE',
        },
      );
      expect(() => validateImportedTableMap(definition)).toThrow('Table mapping is missing for imported Amplify DynamoDB table strategy.');
    });
  });
});
