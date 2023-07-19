import { DataSourceAdapter, MySQLDataSourceAdapter } from '../datasource-adapter';
import { Engine, Field, FieldType, Index, Model, Schema } from '../schema-representation';
import { generateGraphQLSchema, isComputeExpression } from '../schema-generator';

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

  public async getTablesList(): Promise<string[]> {
    return ['Test'];
  }

  public async getFields(tableName: string): Promise<Field[]> {
    return [];
  }

  public async getPrimaryKey(tableName: string): Promise<Index | null> {
    return null;
  }

  public async getIndexes(tableName: string): Promise<Index[]> {
    return [];
  }

  public cleanup(): void {
    // Do Nothing
  }
}

describe('testDataSourceAdapter', () => {
  it('getModels call the default implementation', async () => {
    let adapter: DataSourceAdapter = new TestDataSourceAdapter();
    adapter.getTablesList = jest.fn(async () => ['Test']);
    adapter.getFields = jest.fn(async () => []);
    adapter.getPrimaryKey = jest.fn();
    adapter.getIndexes = jest.fn(async () => []);
    adapter.mapDataType = jest.fn();
    await adapter.getModels();
    expect(adapter.getTablesList).toBeCalledTimes(1);
    expect(adapter.getFields).toBeCalledTimes(1);
    expect(adapter.getIndexes).toBeCalledTimes(1);
    expect(adapter.getPrimaryKey).toBeCalledTimes(1);
  });

  it('test mysql datatype mapping', () => {
    const config = {
      host: 'host',
      database: 'database',
      port: 1234,
      username: 'username',
      password: 'password',
    };
    const adapter = new MySQLDataSourceAdapter(config);
    expect(adapter.mapDataType('varchar', true, 'table', 'field', 'varchar(50)')).toEqual({
      kind: 'Scalar',
      name: 'String',
    });
    expect(adapter.mapDataType('char', true, 'table', 'field', 'varchar(50)')).toEqual({
      kind: 'Scalar',
      name: 'String',
    });
    expect(adapter.mapDataType('enum', true, 'table', 'field', 'enum("OPEN","CLOSED")')).toEqual({
      kind: 'Enum',
      name: 'table_field',
      values: ['OPEN', 'CLOSED'],
    });
    expect(adapter.mapDataType('bool', true, 'table', 'field', 'varchar(50)')).toEqual({
      kind: 'Scalar',
      name: 'Boolean',
    });
    expect(adapter.mapDataType('decimal', true, 'table', 'field', 'varchar(50)')).toEqual({
      kind: 'Scalar',
      name: 'Float',
    });
    expect(adapter.mapDataType('year', false, 'table', 'field', 'varchar(50)')).toEqual({
      kind: 'NonNull',
      type: {
        kind: 'Scalar',
        name: 'Int',
      },
    });
  });

  it('test generate graphql schema from internal reprensentation', () => {
    const dbschema = new Schema(new Engine('MySQL'));

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

  it('generates a default directive and optional types for fields with literal default values', () => {
    const dbschema = new Schema(new Engine('MySQL'));

    let model = new Model('Account');
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
    const dbschema = new Schema(new Engine('MySQL'));

    let model = new Model('Account');
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
    const dbschema = new Schema(new Engine('MySQL'));

    let model = new Model('Profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('type', { kind: 'Enum', name: 'Profile_type', values: ['Manager', 'Employee'] }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateGraphQLSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generates primary key fields as required without the default directive added', () => {
    const dbschema = new Schema(new Engine('MySQL'));

    let model = new Model('Account');
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
