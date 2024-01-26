import { Engine, Field, Model, Schema } from '../schema-representation';
import { generateTypescriptDataSchema } from '../ts-schema-generator/generate-ts-schema';

describe('Type name conversions', () => {
  it('basic models should generate correct typescript data schema', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    let model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('details', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateTypescriptDataSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('check all valid datatypes', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    const model = new Model('Table');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('field1', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('field2', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('field3', { kind: 'Scalar', name: 'Int' }));
    model.addField(new Field('field4', { kind: 'Scalar', name: 'Float' }));
    model.addField(new Field('field5', { kind: 'Scalar', name: 'Boolean' }));
    model.addField(new Field('field6', { kind: 'Scalar', name: 'ID' }));
    model.addField(new Field('field7', { kind: 'Scalar', name: 'AWSDate' }));
    model.addField(new Field('field8', { kind: 'Scalar', name: 'AWSTime' }));
    model.addField(new Field('field9', { kind: 'Scalar', name: 'AWSDateTime' }));
    model.addField(new Field('field10', { kind: 'Scalar', name: 'AWSTimestamp' }));
    model.addField(new Field('field11', { kind: 'Scalar', name: 'AWSJSON' }));
    model.addField(new Field('field12', { kind: 'Scalar', name: 'AWSEmail' }));
    model.addField(new Field('field13', { kind: 'Scalar', name: 'AWSPhone' }));
    model.addField(new Field('field14', { kind: 'Scalar', name: 'AWSURL' }));
    model.addField(new Field('field15', { kind: 'Scalar', name: 'AWSIPAddress' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateTypescriptDataSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generates enum imports correctly', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    const model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('status', { kind: 'Enum', name: 'UserStatus', values: ['ACTIVE', 'INACTIVE'] }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateTypescriptDataSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });
});
