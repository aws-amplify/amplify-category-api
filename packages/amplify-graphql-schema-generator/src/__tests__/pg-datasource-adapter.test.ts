import { gql } from 'graphql-transformer-core';
import { DataSourceAdapter } from '../datasource-adapter';
import { getPostgresSchemaQuery } from '../datasource-adapter/pg-datasource-adapter';
import { generateGraphQLSchema, isComputeExpression } from '../schema-generator';
import { Engine, Field, FieldType, Index, Model, Schema } from '../schema-representation';

class TestDataSourceAdapter extends DataSourceAdapter {
  public async initialize(): Promise<void> {
    // Do Nothing
  }

  public mapDataType(type: string, nullable: boolean): FieldType {
    return {
      kind: 'Scalar',
      name: 'String',
    };
  }

  public getTablesList(): string[] {
    return ['Test'];
  }

  public getFields(tableName: string): Field[] {
    return [];
  }

  public getPrimaryKey(tableName: string): Index | null {
    return null;
  }

  public getIndexes(tableName: string): Index[] {
    return [];
  }

  public cleanup(): void {
    // Do Nothing
  }
  public async test(): Promise<boolean> {
    return true;
  }

  protected async querySchema(): Promise<string> {
    return '';
  }
}

describe('testPostgresDataSourceAdapter', () => {
  it('getModels call the default implementation', async () => {
    const adapter: DataSourceAdapter = new TestDataSourceAdapter();
    adapter.getTablesList = jest.fn(() => ['Test']);
    adapter.getFields = jest.fn(() => []);
    adapter.getPrimaryKey = jest.fn();
    adapter.getIndexes = jest.fn(() => []);
    await adapter.getModels();
    expect(adapter.getTablesList).toBeCalledTimes(1);
    expect(adapter.getFields).toBeCalledTimes(1);
    expect(adapter.getIndexes).toBeCalledTimes(1);
    expect(adapter.getPrimaryKey).toBeCalledTimes(1);
  });

  it('test generate graphql schema from internal reprensentation', () => {
    const dbschema = new Schema(new Engine('Postgres'));

    let model = new Model('Capital');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('countryId', { kind: 'Scalar', name: 'Int' }));
    model.setPrimaryKey(['id']);
    model.addIndex('countryId', ['countryId']);
    dbschema.addModel(model);

    model = new Model('Country');
    const countryIdField = new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } });
    countryIdField.default = { kind: 'DB_GENERATED', value: 'uuid()' };
    model.addField(countryIdField);
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Tasks');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('title', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('description', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('priority', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id', 'title']);
    model.addIndex('tasks_title', ['title']);
    model.addIndex('tasks_title_description', ['title', 'description']);
    dbschema.addModel(model);

    const graphqlSchema = generateGraphQLSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('include option should import only the given tables', () => {
    const dbschema = new Schema(new Engine('Postgres'));

    let model = new Model('Capital');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('countryId', { kind: 'Scalar', name: 'Int' }));
    model.setPrimaryKey(['id']);
    model.addIndex('countryId', ['countryId']);
    dbschema.addModel(model);

    model = new Model('Country');
    const countryIdField = new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } });
    countryIdField.default = { kind: 'DB_GENERATED', value: 'uuid()' };
    model.addField(countryIdField);
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Tasks');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('title', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('description', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('priority', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id', 'title']);
    model.addIndex('tasks_title', ['title']);
    model.addIndex('tasks_title_description', ['title', 'description']);
    dbschema.addModel(model);

    const amplifyInputType = gql`
      input AMPLIFY {
        engine: String = "postgres"
        globalAuthRule: AuthRule = { allow: public }
        include: [String] = ["Tasks"]
      }
    `;

    const graphqlSchema = generateGraphQLSchema(dbschema, amplifyInputType);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('exclude option should not import the given tables', () => {
    const dbschema = new Schema(new Engine('Postgres'));

    let model = new Model('Capital');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('countryId', { kind: 'Scalar', name: 'Int' }));
    model.setPrimaryKey(['id']);
    model.addIndex('countryId', ['countryId']);
    dbschema.addModel(model);

    model = new Model('Country');
    const countryIdField = new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } });
    countryIdField.default = { kind: 'DB_GENERATED', value: 'uuid()' };
    model.addField(countryIdField);
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Tasks');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('title', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('description', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('priority', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id', 'title']);
    model.addIndex('tasks_title', ['title']);
    model.addIndex('tasks_title_description', ['title', 'description']);
    dbschema.addModel(model);

    const amplifyInputType = gql`
      input AMPLIFY {
        engine: String = "postgres"
        globalAuthRule: AuthRule = { allow: public }
        exclude: [String] = ["Tasks"]
      }
    `;

    const graphqlSchema = generateGraphQLSchema(dbschema, amplifyInputType);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('providing both include and exclude option should throw an error', () => {
    const dbschema = new Schema(new Engine('Postgres'));

    let model = new Model('Capital');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('countryId', { kind: 'Scalar', name: 'Int' }));
    model.setPrimaryKey(['id']);
    model.addIndex('countryId', ['countryId']);
    dbschema.addModel(model);

    model = new Model('Country');
    const countryIdField = new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } });
    countryIdField.default = { kind: 'DB_GENERATED', value: 'uuid()' };
    model.addField(countryIdField);
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Tasks');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('title', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('description', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('priority', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id', 'title']);
    model.addIndex('tasks_title', ['title']);
    model.addIndex('tasks_title_description', ['title', 'description']);
    dbschema.addModel(model);

    const amplifyInputType = gql`
      input AMPLIFY {
        engine: String = "postgres"
        globalAuthRule: AuthRule = { allow: public }
        include: [String] = ["Tasks"]
        exclude: [String] = ["Tasks"]
      }
    `;
    expect(() => generateGraphQLSchema(dbschema, amplifyInputType)).toThrowError(
      'Cannot specify both include and exclude options. Please check your GraphQL schema.',
    );
  });

  it('providing incorrect include and exclude datatype should throw an error', () => {
    const dbschema = new Schema(new Engine('Postgres'));

    let model = new Model('Capital');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('countryId', { kind: 'Scalar', name: 'Int' }));
    model.setPrimaryKey(['id']);
    model.addIndex('countryId', ['countryId']);
    dbschema.addModel(model);

    model = new Model('Country');
    const countryIdField = new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } });
    countryIdField.default = { kind: 'DB_GENERATED', value: 'uuid()' };
    model.addField(countryIdField);
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Tasks');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('title', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('description', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('priority', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id', 'title']);
    model.addIndex('tasks_title', ['title']);
    model.addIndex('tasks_title_description', ['title', 'description']);
    dbschema.addModel(model);

    const amplifyInputTypeInclude = gql`
      input AMPLIFY {
        engine: String = "postgres"
        globalAuthRule: AuthRule = { allow: public }
        include: String = "Tasks"
      }
    `;
    expect(() => generateGraphQLSchema(dbschema, amplifyInputTypeInclude)).toThrowError(
      'Invalid value for include option. Please check your GraphQL schema.',
    );

    const amplifyInputTypeExclude = gql`
      input AMPLIFY {
        engine: String = "postgres"
        globalAuthRule: AuthRule = { allow: public }
        exclude: String = "Tasks"
      }
    `;
    expect(() => generateGraphQLSchema(dbschema, amplifyInputTypeExclude)).toThrowError(
      'Invalid value for include option. Please check your GraphQL schema.',
    );
  });

  it('generate schema retains hasOne and belongsTo relationship and removes the non-relational fields added manually', () => {
    const dbschema = new Schema(new Engine('Postgres'));

    let model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Profile');
    const profileIdField = new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } });
    model.addField(profileIdField);
    model.addField(new Field('content', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('userId', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const existingSchema = gql`
      input AMPLIFY {
        engine: String = "postgres"
        globalAuthRule: AuthRule = { allow: public }
      }
      type User @model {
        id: Int!
        name: String
        manuallyAddedField: String
        profile: Profile @hasOne(references: ["userId"])
      }
      type Profile @model {
        id: Int!
        content: String
        manuallyAddedField: String
        userId: Int!
        user: User @belongsTo(references: ["userId"])
      }
    `;

    const graphqlSchema = generateGraphQLSchema(dbschema, existingSchema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generate schema retains hasMany and belongsTo relationship', () => {
    const dbschema = new Schema(new Engine('Postgres'));

    let model = new Model('Blog');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Post');
    const postIdField = new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } });
    model.addField(postIdField);
    model.addField(new Field('content', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('blogId', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const existingSchema = gql`
      input AMPLIFY {
        engine: String = "postgres"
        globalAuthRule: AuthRule = { allow: public }
      }
      type Blog @model {
        id: Int!
        name: String
        posts: [Post] @hasMany(references: ["userId"])
      }
      type Post @model {
        id: Int!
        content: String
        blogId: Int!
        blog: Blog @belongsTo(references: ["userId"])
      }
    `;

    const graphqlSchema = generateGraphQLSchema(dbschema, existingSchema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generates a default directive and optional types for fields with literal default values', () => {
    const dbschema = new Schema(new Engine('Postgres'));

    const model = new Model('Account');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    const serialNoField = new Field('serialNumber', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } });
    const ownerNameField = new Field('ownerName', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } });
    const amountField = new Field('amount', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Float' } });

    serialNoField.default = { kind: 'DB_GENERATED', value: -1 };
    ownerNameField.default = { kind: 'DB_GENERATED', value: 'na' };
    amountField.default = { kind: 'DB_GENERATED', value: 101.101 };
    model.addField(serialNoField);
    model.addField(ownerNameField);
    model.addField(amountField);
    model.setPrimaryKey(['id']);

    dbschema.addModel(model);
    const graphqlSchema = generateGraphQLSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generates optional type but no default directive for fields with computed default values', () => {
    const dbschema = new Schema(new Engine('Postgres'));

    const model = new Model('Account');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    const computedField = new Field('computed', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Float' } });

    computedField.default = { kind: 'DB_GENERATED', value: '(RAND() * RAND())' };
    model.addField(computedField);
    model.setPrimaryKey(['id']);

    dbschema.addModel(model);
    const graphqlSchema = generateGraphQLSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('identifies the computed default values', () => {
    const testComputedExpressions = [
      'RAND()',
      'COS(PI())',
      'CONV(-17,10,-18)',
      'COS(CONV(-17,10,-18))',
      'LOG(CONV(-17,10,-18), 10)',
      '(RAND())',
      '(COS(PI()) * RAND())',
      '(CONV(-17,10,-18) + LOG(10, 100))',
      '(COS(CONV(-17,10,-18)))',
      '(LOG(CONV(-17,10,-18), 10))',
    ];

    testComputedExpressions.map((expr) => {
      expect(isComputeExpression(expr)).toEqual(true);
    });
  });

  it('test generate graphql schema on model with enum field', () => {
    const dbschema = new Schema(new Engine('Postgres'));

    const model = new Model('Profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('type', { kind: 'Enum', name: 'Profile_type', values: ['Manager', 'Employee'] }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateGraphQLSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generates primary key fields as required without the default directive added', () => {
    const dbschema = new Schema(new Engine('Postgres'));

    const model = new Model('Account');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    const serialNoField = new Field('serialNumber', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } });
    const ownerNameField = new Field('ownerName', { kind: 'Scalar', name: 'String' });
    const amountField = new Field('amount', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Float' } });

    model.addField(serialNoField);
    model.addField(ownerNameField);
    model.addField(amountField);
    model.setPrimaryKey(['id', 'serialNumber']);

    dbschema.addModel(model);
    const graphqlSchema = generateGraphQLSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });
});

describe('getPostgresSchemaQuery', () => {
  test('uses correct schema query', () => {
    expect(getPostgresSchemaQuery('mydb')).toMatchSnapshot();
  });
});
