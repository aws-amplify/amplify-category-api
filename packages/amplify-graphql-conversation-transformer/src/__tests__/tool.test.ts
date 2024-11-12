import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { parse, DocumentNode } from 'graphql';
import { processTools } from '../tools/process-tools';
import { ConversationToolModelOperation } from '../conversation-directive-configuration';

describe('processTools', () => {
  const mockContext = (schema: DocumentNode) => {
    return {
      output: {
        getType: (typeName: string) => schema.definitions.find((def) => 'name' in def && def.name?.value === typeName),

        getObject: (typeName: string) =>
          schema.definitions.find((def) => def.kind === 'ObjectTypeDefinition' && def.name.value === typeName),
      },
    } as TransformerContextProvider;
  };

  it('produces required field with non-null input type', () => {
    const schema = parse(/* GraphQL */ `
      input NonNullInput {
        name: String!
      }

      type Query {
        test(input: NonNullInput!): String
      }
    `);

    const ctx = mockContext(schema);

    const tools = processTools(
      [
        {
          name: 'test',
          description: 'test',
          queryName: 'test',
        },
      ],
      ctx,
    );

    expect(tools).toBeDefined();
    expect(tools?.length).toBe(1);

    const tool = tools![0];
    expect(tool.inputSchema.json.required).toEqual(['input']);
    const expected = {
      $defs: {
        NonNullInput: {
          properties: { name: { type: 'string' } },
          required: ['name'],
          type: 'object',
        },
      },
      properties: {
        input: {
          properties: { name: { type: 'string' } },
          required: ['name'],
          type: 'object',
        },
      },
      required: ['input'],
      type: 'object',
    };
    expect(tool.inputSchema.json).toEqual(expected);
  });

  it('should handle model list operations correctly', () => {
    const schema = parse(/* GraphQL */ `
      type Todo @aws_iam @aws_cognito_user_pools {
        name: String
        completed: Boolean
        id: ID!
        createdAt: AWSDateTime!
        updatedAt: AWSDateTime!
        owner: String
      }

      input ModelTodoFilterInput {
        name: ModelStringInput
        completed: ModelBooleanInput
        id: ModelIDInput
        createdAt: ModelStringInput
        updatedAt: ModelStringInput
        and: [ModelTodoFilterInput]
        or: [ModelTodoFilterInput]
        not: ModelTodoFilterInput
        owner: ModelStringInput
      }

      input ModelIDInput {
        ne: ID
        eq: ID
        le: ID
        lt: ID
        ge: ID
        gt: ID
        contains: ID
        notContains: ID
        between: [ID]
        beginsWith: ID
        attributeExists: Boolean
        attributeType: ModelAttributeTypes
        size: ModelSizeInput
      }

      input ModelBooleanInput {
        ne: Boolean
        eq: Boolean
        attributeExists: Boolean
        attributeType: ModelAttributeTypes
      }

      enum ModelAttributeTypes {
        binary
        binarySet
        bool
        list
        map
        number
        numberSet
        string
        stringSet
        _null
      }

      input ModelStringInput {
        ne: String
        eq: String
        le: String
        lt: String
        ge: String
        gt: String
        contains: String
        notContains: String
        between: [String]
        beginsWith: String
        attributeExists: Boolean
        attributeType: ModelAttributeTypes
        size: ModelSizeInput
      }
      input ModelSizeInput {
        ne: Int
        eq: Int
        le: Int
        lt: Int
        ge: Int
        gt: Int
        between: [Int]
      }

      type ModelTodoConnection @aws_iam @aws_cognito_user_pools {
        items: [Todo]!
        nextToken: String
      }

      type Query {
        listTodos(filter: ModelTodoFilterInput, limit: Int, nextToken: String): ModelTodoConnection @aws_iam @aws_cognito_user_pools
      }
    `);

    const ctx = mockContext(schema);

    const tools = processTools(
      [
        {
          name: 'list-todos',
          description: 'List all todos',
          modelName: 'Todo',
          modelOperation: ConversationToolModelOperation.list,
        },
      ],
      ctx,
    );

    expect(tools).toBeDefined();
    expect(tools?.length).toBe(1);

    const listCustomersTool = tools![0];
    expect(listCustomersTool.graphqlRequestInputDescriptor).toBeDefined();
    expect(listCustomersTool.graphqlRequestInputDescriptor?.propertyTypes).toEqual({
      filter: 'ModelTodoFilterInput',
      limit: 'Int',
      nextToken: 'String',
    });
    expect(listCustomersTool.graphqlRequestInputDescriptor?.selectionSet).toBe(
      'items { name completed id createdAt updatedAt owner } nextToken',
    );

    const expected = {
      $defs: {
        ModelAttributeTypes: {
          enum: ['binary', 'binarySet', 'bool', 'list', 'map', 'number', 'numberSet', 'string', 'stringSet', '_null'],
          type: 'string',
        },
        ModelBooleanInput: {
          properties: {
            attributeExists: { type: 'boolean' },
            attributeType: { $ref: '#/$defs/ModelAttributeTypes' },
            eq: { type: 'boolean' },
            ne: { type: 'boolean' },
          },
          type: 'object',
        },
        ModelIDInput: {
          properties: {
            attributeExists: { type: 'boolean' },
            attributeType: { $ref: '#/$defs/ModelAttributeTypes' },
            beginsWith: { type: 'string' },
            between: {
              items: { type: 'string' },
              type: 'array',
            },
            contains: { type: 'string' },
            eq: { type: 'string' },
            ge: { type: 'string' },
            gt: { type: 'string' },
            le: { type: 'string' },
            lt: { type: 'string' },
            ne: { type: 'string' },
            notContains: { type: 'string' },
            size: { $ref: '#/$defs/ModelSizeInput' },
          },
          type: 'object',
        },
        ModelSizeInput: {
          properties: {
            between: {
              items: { type: 'integer' },
              type: 'array',
            },
            eq: { type: 'integer' },
            ge: { type: 'integer' },
            gt: { type: 'integer' },
            le: { type: 'integer' },
            lt: { type: 'integer' },
            ne: { type: 'integer' },
          },
          type: 'object',
        },
        ModelStringInput: {
          properties: {
            attributeExists: { type: 'boolean' },
            attributeType: { $ref: '#/$defs/ModelAttributeTypes' },
            beginsWith: { type: 'string' },
            between: {
              items: { type: 'string' },
              type: 'array',
            },
            contains: { type: 'string' },
            eq: { type: 'string' },
            ge: { type: 'string' },
            gt: { type: 'string' },
            le: { type: 'string' },
            lt: { type: 'string' },
            ne: { type: 'string' },
            notContains: { type: 'string' },
            size: { $ref: '#/$defs/ModelSizeInput' },
          },
          type: 'object',
        },
        ModelTodoFilterInput: {
          properties: {
            and: {
              items: { $ref: '#/$defs/ModelTodoFilterInput' },
              type: 'array',
            },
            completed: { $ref: '#/$defs/ModelBooleanInput' },
            createdAt: { $ref: '#/$defs/ModelStringInput' },
            id: { $ref: '#/$defs/ModelIDInput' },
            name: { $ref: '#/$defs/ModelStringInput' },
            not: { $ref: '#/$defs/ModelTodoFilterInput' },
            or: {
              items: { $ref: '#/$defs/ModelTodoFilterInput' },
              type: 'array',
            },
            owner: { $ref: '#/$defs/ModelStringInput' },
            updatedAt: { $ref: '#/$defs/ModelStringInput' },
          },
          type: 'object',
        },
      },
      properties: {
        filter: {
          properties: {
            and: {
              items: { $ref: '#/$defs/ModelTodoFilterInput' },
              type: 'array',
            },
            completed: { $ref: '#/$defs/ModelBooleanInput' },
            createdAt: { $ref: '#/$defs/ModelStringInput' },
            id: { $ref: '#/$defs/ModelIDInput' },
            name: { $ref: '#/$defs/ModelStringInput' },
            not: { $ref: '#/$defs/ModelTodoFilterInput' },
            or: {
              items: { $ref: '#/$defs/ModelTodoFilterInput' },
              type: 'array',
            },
            owner: { $ref: '#/$defs/ModelStringInput' },
            updatedAt: { $ref: '#/$defs/ModelStringInput' },
          },
          type: 'object',
        },
        limit: { type: 'integer' },
        nextToken: { type: 'string' },
      },
      type: 'object',
    };

    expect(listCustomersTool.inputSchema.json).toEqual(expected);
    expect(listCustomersTool.name).toBe('list-todos');
    expect(listCustomersTool.description).toBe('List all todos');
  });

  it('should handle model list operations with relationships correctly', () => {
    const schema = parse(/* GraphQL */ `
      type Customer @aws_iam @aws_cognito_user_pools {
        name: String
        email: AWSEmail
        activeCart: Cart
        orderHistory(filter: ModelOrderFilterInput, sortDirection: ModelSortDirection, limit: Int, nextToken: String): ModelOrderConnection
        id: ID!
        createdAt: AWSDateTime!
        updatedAt: AWSDateTime!
        owner: String
      }

      type Cart @aws_iam @aws_cognito_user_pools {
        items: [Item!]!
        customerId: ID
        customer: Customer
        id: ID!
        createdAt: AWSDateTime!
        updatedAt: AWSDateTime!
        owner: String
      }

      type Order @aws_iam @aws_cognito_user_pools {
        items: [Item!]!
        customerId: ID
        customer: Customer
        id: ID!
        createdAt: AWSDateTime!
        updatedAt: AWSDateTime!
        owner: String
      }

      type Item @aws_iam @aws_cognito_user_pools {
        name: String!
        price: Float!
      }

      type Query {
        listCustomers(filter: ModelCustomerFilterInput, limit: Int, nextToken: String): ModelCustomerConnection
          @aws_iam
          @aws_cognito_user_pools
      }

      input ModelCustomerFilterInput {
        name: ModelStringInput
        email: ModelStringInput
        id: ModelIDInput
        createdAt: ModelStringInput
        updatedAt: ModelStringInput
        and: [ModelCustomerFilterInput]
        or: [ModelCustomerFilterInput]
        not: ModelCustomerFilterInput
        owner: ModelStringInput
      }

      input ModelIDInput {
        ne: ID
        eq: ID
        le: ID
        lt: ID
        ge: ID
        gt: ID
        contains: ID
        notContains: ID
        between: [ID]
        beginsWith: ID
        attributeExists: Boolean
        attributeType: ModelAttributeTypes
        size: ModelSizeInput
      }

      input ModelBooleanInput {
        ne: Boolean
        eq: Boolean
        attributeExists: Boolean
        attributeType: ModelAttributeTypes
      }

      enum ModelAttributeTypes {
        binary
        binarySet
        bool
        list
        map
        number
        numberSet
        string
        stringSet
        _null
      }

      input ModelStringInput {
        ne: String
        eq: String
        le: String
        lt: String
        ge: String
        gt: String
        contains: String
        notContains: String
        between: [String]
        beginsWith: String
        attributeExists: Boolean
        attributeType: ModelAttributeTypes
        size: ModelSizeInput
      }
      input ModelSizeInput {
        ne: Int
        eq: Int
        le: Int
        lt: Int
        ge: Int
        gt: Int
        between: [Int]
      }

      type ModelCustomerConnection @aws_iam @aws_cognito_user_pools {
        items: [Customer]!
        nextToken: String
      }

      type ModelOrderConnection @aws_iam @aws_cognito_user_pools {
        items: [Order]!
        nextToken: String
      }
    `);

    const ctx = mockContext(schema);

    const tools = processTools(
      [
        {
          name: 'list-customers',
          description: 'List all customers',
          modelName: 'Customer',
          modelOperation: ConversationToolModelOperation.list,
        },
      ],
      ctx,
    );

    expect(tools).toBeDefined();
    expect(tools?.length).toBe(1);

    const listCustomersTool = tools![0];
    expect(listCustomersTool.graphqlRequestInputDescriptor).toBeDefined();
    expect(listCustomersTool.graphqlRequestInputDescriptor?.propertyTypes).toEqual({
      filter: 'ModelCustomerFilterInput',
      limit: 'Int',
      nextToken: 'String',
    });
    expect(listCustomersTool.graphqlRequestInputDescriptor?.selectionSet).toBe(
      'items { name email activeCart { items { name price } customerId id createdAt updatedAt owner } orderHistory { items { items { name price } customerId id createdAt updatedAt owner } nextToken } id createdAt updatedAt owner } nextToken',
    );

    const expected = {
      $defs: {
        ModelAttributeTypes: {
          enum: ['binary', 'binarySet', 'bool', 'list', 'map', 'number', 'numberSet', 'string', 'stringSet', '_null'],
          type: 'string',
        },
        ModelCustomerFilterInput: {
          properties: {
            and: {
              items: {
                $ref: '#/$defs/ModelCustomerFilterInput',
              },
              type: 'array',
            },
            createdAt: {
              $ref: '#/$defs/ModelStringInput',
            },
            email: {
              $ref: '#/$defs/ModelStringInput',
            },
            id: {
              $ref: '#/$defs/ModelIDInput',
            },
            name: {
              $ref: '#/$defs/ModelStringInput',
            },
            not: {
              $ref: '#/$defs/ModelCustomerFilterInput',
            },
            or: {
              items: {
                $ref: '#/$defs/ModelCustomerFilterInput',
              },
              type: 'array',
            },
            owner: {
              $ref: '#/$defs/ModelStringInput',
            },
            updatedAt: {
              $ref: '#/$defs/ModelStringInput',
            },
          },
          type: 'object',
        },
        ModelIDInput: {
          properties: {
            attributeExists: {
              type: 'boolean',
            },
            attributeType: {
              $ref: '#/$defs/ModelAttributeTypes',
            },
            beginsWith: {
              type: 'string',
            },
            between: {
              items: {
                type: 'string',
              },
              type: 'array',
            },
            contains: {
              type: 'string',
            },
            eq: {
              type: 'string',
            },
            ge: {
              type: 'string',
            },
            gt: {
              type: 'string',
            },
            le: {
              type: 'string',
            },
            lt: {
              type: 'string',
            },
            ne: {
              type: 'string',
            },
            notContains: {
              type: 'string',
            },
            size: {
              $ref: '#/$defs/ModelSizeInput',
            },
          },
          type: 'object',
        },
        ModelSizeInput: {
          properties: {
            between: {
              items: {
                type: 'integer',
              },
              type: 'array',
            },
            eq: {
              type: 'integer',
            },
            ge: {
              type: 'integer',
            },
            gt: {
              type: 'integer',
            },
            le: {
              type: 'integer',
            },
            lt: {
              type: 'integer',
            },
            ne: {
              type: 'integer',
            },
          },
          type: 'object',
        },
        ModelStringInput: {
          properties: {
            attributeExists: {
              type: 'boolean',
            },
            attributeType: {
              $ref: '#/$defs/ModelAttributeTypes',
            },
            beginsWith: {
              type: 'string',
            },
            between: {
              items: {
                type: 'string',
              },
              type: 'array',
            },
            contains: {
              type: 'string',
            },
            eq: {
              type: 'string',
            },
            ge: {
              type: 'string',
            },
            gt: {
              type: 'string',
            },
            le: {
              type: 'string',
            },
            lt: {
              type: 'string',
            },
            ne: {
              type: 'string',
            },
            notContains: {
              type: 'string',
            },
            size: {
              $ref: '#/$defs/ModelSizeInput',
            },
          },
          type: 'object',
        },
      },
      properties: {
        filter: {
          properties: {
            and: {
              items: {
                $ref: '#/$defs/ModelCustomerFilterInput',
              },
              type: 'array',
            },
            createdAt: {
              $ref: '#/$defs/ModelStringInput',
            },
            email: {
              $ref: '#/$defs/ModelStringInput',
            },
            id: {
              $ref: '#/$defs/ModelIDInput',
            },
            name: {
              $ref: '#/$defs/ModelStringInput',
            },
            not: {
              $ref: '#/$defs/ModelCustomerFilterInput',
            },
            or: {
              items: {
                $ref: '#/$defs/ModelCustomerFilterInput',
              },
              type: 'array',
            },
            owner: {
              $ref: '#/$defs/ModelStringInput',
            },
            updatedAt: {
              $ref: '#/$defs/ModelStringInput',
            },
          },
          type: 'object',
        },
        limit: {
          type: 'integer',
        },
        nextToken: {
          type: 'string',
        },
      },
      type: 'object',
    };
    expect(listCustomersTool.inputSchema.json).toEqual(expected);
    expect(listCustomersTool.name).toBe('list-customers');
    expect(listCustomersTool.description).toBe('List all customers');

    // Verify we don't go too deep in the relationships
    // expect(listCustomersTool.graphqlRequestInputDescriptor?.selectionSet).not.toContain('items');
  });
});

/*
      type Customer @model {
        id: ID!
        name: String!
        orders: [Order] @hasMany
      }

      type Order @model {
        id: ID!
        total: Float!
        customer: Customer @belongsTo
        items: [OrderItem] @hasMany
      }

      type OrderItem @model {
        id: ID!
        quantity: Int!
        order: Order @belongsTo
      }

      type Query {
        listCustomers: [Customer]
      }
*/
