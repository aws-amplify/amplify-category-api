import { Engine, Field, Model, Schema } from '../schema-representation';
import { generateTypescriptDataSchema } from '../ts-schema-generator/generate-ts-schema';
import { DataSourceConfig } from '../ts-schema-generator/helpers';
import { TypescriptDataSchemaGenerator } from '../ts-schema-generator/ts-schema-generator';

jest.mock('../utils', () => ({
  getHostVpc: jest.fn(() => {
    return {
      vpcId: 'abc',
      securityGroupIds: ['sg0', 'sg1', 'sg2'],
      subnetAvailabilityZoneConfig: [
        {
          subnetId: 'sb0',
          availabilityZone: 'az0',
        },
        {
          subnetId: 'sb1',
          availabilityZone: 'az1',
        },
        {
          subnetId: 'sb2',
          availabilityZone: 'az2',
        },
      ],
    };
  }),
}));

describe('Type name conversions', () => {
  it('ts schema generator should invoke generate schema', async () => {
    const dbschema = new Schema(new Engine('MySQL'));
    const model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const buildSchemaMockMethod = jest.spyOn(TypescriptDataSchemaGenerator as any, 'buildSchema');
    buildSchemaMockMethod.mockImplementation(() => {
      return dbschema;
    });

    const schema = await TypescriptDataSchemaGenerator.generate({
      engine: 'mysql',
      host: 'host',
      port: 3306,
      database: 'database',
      username: 'username',
      password: 'password',
      connectionUriSecretName: 'secret',
    });
    expect(schema).toMatchSnapshot();
  });

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

  it('schema with database config secret and vpc should generate typescript data schema with configure', () => {
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

    const config: DataSourceConfig = {
      identifier: 'ID1234567890',
      secretName: 'CONN_STR',
      vpcConfig: {
        vpcId: '123',
        securityGroupIds: ['sb1', 'sb2', 'sb3'],
        subnetAvailabilityZoneConfig: [
          {
            subnetId: 'sb1',
            availabilityZone: 'az1',
          },
          {
            subnetId: 'sb2',
            availabilityZone: 'az2',
          },
          {
            subnetId: 'sb3',
            availabilityZone: 'az3',
          },
        ],
      },
    };

    const graphqlSchema = generateTypescriptDataSchema(dbschema, config);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('postgres schema with database config secret and vpc should generate typescript data schema with configure', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    const model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const config: DataSourceConfig = {
      identifier: 'ID1234567890',
      secretName: 'CONN_STR',
      vpcConfig: {
        vpcId: '123',
        securityGroupIds: ['sb1'],
        subnetAvailabilityZoneConfig: [
          {
            subnetId: 'sb1',
            availabilityZone: 'az1',
          },
        ],
      },
    };

    const graphqlSchema = generateTypescriptDataSchema(dbschema, config);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('schema with database config without vpc should generate typescript data schema with configure', () => {
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

    const config: DataSourceConfig = {
      identifier: 'ID1234567890',
      secretName: 'CONN_STR',
    };

    const graphqlSchema = generateTypescriptDataSchema(dbschema, config);
    expect(graphqlSchema).toMatchSnapshot();
  });
});
