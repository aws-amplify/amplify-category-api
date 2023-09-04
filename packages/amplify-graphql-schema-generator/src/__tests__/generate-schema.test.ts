import { convertToGraphQLTypeName } from '../schema-generator/generate-schema';
import { Engine, Field, Model, Schema } from '../schema-representation';
import { generateGraphQLSchema } from '../schema-generator';

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
