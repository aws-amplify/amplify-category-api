import path from 'path';
import * as fs from 'fs';
import { parse } from 'graphql';
import { convertToGraphQLTypeName, printSchema, convertToGraphQLFieldName } from '../schema-generator/generate-schema';
import { Engine, Field, Model, Schema } from '../schema-representation';
import { generateGraphQLSchema } from '../schema-generator';
import { getSSLConfig } from '../utils';

describe('Type name conversions', () => {
  it('GraphQL idiomatic type name conversions', () => {
    // Singularize and Pascal case
    expect(convertToGraphQLTypeName('posts')).toEqual('Post');
    // Singularize
    expect(convertToGraphQLTypeName('Salaries')).toEqual('Salary');
    expect(convertToGraphQLTypeName('Lotuses')).toEqual('Lotus');
    // Pascal case
    expect(convertToGraphQLTypeName('employees_salaries')).toEqual('EmployeesSalary');

    // Remove special characters not supported in GraphQL
    expect(convertToGraphQLTypeName('Employees_salaries-Tables')).toEqual('EmployeesSalariesTable');
    expect(convertToGraphQLTypeName('_employee_Salaries-tables')).toEqual('EmployeeSalariesTable');
    expect(convertToGraphQLTypeName('Employees$salaries-#Table%log@Rates!types')).toEqual('EmployeesSalariesTableLogRatesType');

    // Remove numeric or special character prefix
    expect(convertToGraphQLTypeName('1Employee')).toEqual('Employee');
    expect(convertToGraphQLTypeName('12_123Employee')).toEqual('Employee');
    expect(convertToGraphQLTypeName('_123Employee')).toEqual('Employee');
    expect(convertToGraphQLTypeName('-#123Employee')).toEqual('Employee');
    expect(convertToGraphQLTypeName('123-Employee_345')).toEqual('Employee345');
    expect(convertToGraphQLTypeName('123__Employee_345')).toEqual('Employee345');

    // If only non-alphabetic characters are present, use a meaningful name
    expect(convertToGraphQLTypeName('123')).toEqual('Model123');
    expect(convertToGraphQLTypeName('_123')).toEqual('Model123');
    expect(convertToGraphQLTypeName('_#123')).toEqual('Model123');
  });

  it('infers refersTo from model name', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    let model = new Model('users');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('details', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateGraphQLSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });
});

describe('enum imports', () => {
  it('generates enum imports', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    const model = new Model('users');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('status', { kind: 'Enum', name: 'UserStatus', values: ['ACTIVE', 'INACTIVE'] }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateGraphQLSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('enum values with single character', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    const model = new Model('users');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('status', { kind: 'Enum', name: 'UserStatus', values: ['A', 'D', 'B'] }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateGraphQLSchema(dbschema);
    parse(graphqlSchema); // Parse to make sure that the Schema is valid.
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('invalid enum value must throw an error', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    const model = new Model('users');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('status', { kind: 'Enum', name: 'UserStatus', values: ['ACTIVE-0', 'INACTIVE-1'] }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    expect(() => generateGraphQLSchema(dbschema)).toThrow(
      'Enum "UserStatus" (values: ACTIVE-0,INACTIVE-1) contains one or more invalid values. Enum values must match the regex [_A-Za-z][_0-9A-Za-z]*.',
    );
  });

  it('multiple enum fields of same name must generate one graphql enum type', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    let model = new Model('users');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('status', { kind: 'Enum', name: 'UserStatus', values: ['ACTIVE', 'INACTIVE'] }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('details', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('profilestatus', { kind: 'Enum', name: 'UserStatus', values: ['ACTIVE', 'INACTIVE'] }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateGraphQLSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generates nonnull enum types correctly', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    const model = new Model('users');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('status', { kind: 'NonNull', type: { kind: 'Enum', name: 'UserStatus', values: ['ACTIVE', 'INACTIVE'] } }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateGraphQLSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });
});

describe('Field name conversions', () => {
  it('GraphQL idiomatic field name conversions', () => {
    // leave as-is
    expect(convertToGraphQLFieldName('posts')).toEqual('posts');
    expect(convertToGraphQLFieldName('postscolumn')).toEqual('postscolumn');
    // Camel case
    expect(convertToGraphQLFieldName('employees_salary')).toEqual('employeesSalary');

    // Remove special characters not supported in GraphQL
    expect(convertToGraphQLFieldName('Employees_salaries-Column')).toEqual('employeesSalariesColumn');
    expect(convertToGraphQLFieldName('_employee_Salaries-column')).toEqual('employeeSalariesColumn');
    expect(convertToGraphQLFieldName('Employees$salaries-#Table%log@Rates!types')).toEqual('employeesSalariesTableLogRatesTypes');
    expect(convertToGraphQLFieldName('ID')).toEqual('iD');
    expect(convertToGraphQLFieldName('MyID')).toEqual('myID');

    // Remove numeric or special character prefix
    expect(convertToGraphQLFieldName('1Employee')).toEqual('employee');
    expect(convertToGraphQLFieldName('12_123Employee')).toEqual('employee');
    expect(convertToGraphQLFieldName('_123Employee')).toEqual('employee');
    expect(convertToGraphQLFieldName('-#123Employee')).toEqual('employee');
    expect(convertToGraphQLFieldName('123-Employee_345')).toEqual('employee345');
    expect(convertToGraphQLFieldName('123__Employee_345')).toEqual('employee345');

    // If only non-alphabetic characters are present, use a meaningful name
    expect(convertToGraphQLFieldName('123')).toEqual('field123');
    expect(convertToGraphQLFieldName('_123')).toEqual('field123');
    expect(convertToGraphQLFieldName('_#123')).toEqual('field123');
  });

  it('infers refersTo from column names', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    let model = new Model('users');
    model.addField(new Field('Id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name_field', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['Id', 'name_field']);
    dbschema.addModel(model);

    model = new Model('profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('Details', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    model.addIndex('profilesByDetails', ['Details']);
    dbschema.addModel(model);

    const graphqlSchema = generateGraphQLSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });
});

describe('Format generated schema', () => {
  it('generates schema with consistent type ordering', () => {
    const document = parse(`
        type User @model {
            id: ID!
        }
        type Profile @model {
            id: ID!
        }
    `);
    expect(printSchema(document)).toMatchInlineSnapshot(`
      "type Profile @model {
        id: ID!
      }

      type User @model {
        id: ID!
      }
      "
    `);
  });

  describe('getSSLConfig should use the correct certificate', () => {
    it('should use the bundled certificate', () => {
      const sslConfig = getSSLConfig('random-host@rds.amazonaws.com');
      const RDS_CERT_FILE_NAME = 'aws-rds-global-bundle.pem';
      const RDS_CERT_FILE_PATH = path.join(__dirname, '..', '..', 'certs', RDS_CERT_FILE_NAME);
      expect(sslConfig).toEqual(
        expect.objectContaining({
          rejectUnauthorized: true,
          ca: fs.readFileSync(RDS_CERT_FILE_PATH, 'utf-8'),
        }),
      );
    });

    it('should use the default trust store', () => {
      const sslConfig = getSSLConfig('random-host@db-provider.com');
      expect(sslConfig).toEqual(
        expect.objectContaining({
          rejectUnauthorized: true,
        }),
      );
    });

    it('should use the custom certificate', () => {
      const sslConfig = getSSLConfig('random-host@rexternal-db.com', 'SSL_CERTIFICATE');
      expect(sslConfig).toEqual(
        expect.objectContaining({
          rejectUnauthorized: true,
          ca: 'SSL_CERTIFICATE',
        }),
      );
    });
  });
});
