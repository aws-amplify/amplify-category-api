import * as fs from 'fs';
import { AmplifyGraphqlDefinition } from '../../amplify-graphql-definition';
import { ModelDataSourceDefinition } from '../../types';

describe('Combined API definitions', () => {
  let tmpDir: string;

  const defaultDDBSchema = 'type DefaultDDBModel @model {id: ID! @primaryKey}';
  const defaultDDBDataSource: ModelDataSourceDefinition = {
    name: 'DefaultDynamoDBDataSource',
    strategy: {
      dbType: 'DYNAMODB',
      provisionStrategy: 'DEFAULT',
    },
  };

  const amplifyManagedDDBSchema = 'type AmplifyManagedModel @model {id: ID! @primaryKey}';
  const amplifyManagedDDBDataSource: ModelDataSourceDefinition = {
    name: 'AmplifyManagedDynamo',
    strategy: {
      dbType: 'DYNAMODB',
      provisionStrategy: 'AMPLIFY_TABLE',
    }
  };

  const sqlSchema = 'type SQLModel @model {id: ID! @primaryKey}';
  const sqlDataSource: ModelDataSourceDefinition = {
    name: 'MySqlDataSource',
    strategy: {
      dbType: 'MYSQL',
      vpcConfiguration: {
        vpcId: 'vpc-1234abcd',
        securityGroupIds: ['sg-123'],
        subnetAvailabilityZones: [{ subnetId: 'subnet-123', availabilityZone: 'us-east-1a' }],
      },
      dbConnectionConfig: {
        hostnameSsmPath: '/ssm/path/hostnameSsmPath',
        portSsmPath: '/ssm/path/portSsmPath',
        usernameSsmPath: '/ssm/path/usernameSsmPath',
        passwordSsmPath: '/ssm/path/passwordSsmPath',
        databaseNameSsmPath: '/ssm/path/databaseNameSsmPath',
      },
    }
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync('combined-definition-tests');
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir, { recursive: true });
  });

  it('allows callers to override specific models in a schema', () => {
    const def = AmplifyGraphqlDefinition.fromString(
      `
      ${defaultDDBSchema}
      ${amplifyManagedDDBSchema}
      ${sqlSchema}
      `,
      defaultDDBDataSource,
      {
        'AmplifyManagedModel': amplifyManagedDDBDataSource,
        'SQLModel': sqlDataSource,
      }
    );

    expect(def).toBeDefined();
    expect(def.schema).toBeDefined();

    expect(def.schema).toContain('type DefaultDDBModel');
    expect(def.modelDataSourceDefinitions['DefaultDDBModel']).toEqual(defaultDDBDataSource);

    expect(def.schema).toContain('type AmplifyManagedModel');
    expect(def.modelDataSourceDefinitions['AmplifyManagedModel']).toEqual(amplifyManagedDDBDataSource);

    expect(def.schema).toContain('type SQLModel');
    expect(def.modelDataSourceDefinitions['SQLModel']).toEqual(sqlDataSource);

  });

  it('composes a single definition from multiple component definitions', () => {

    const defaultDdbDef = AmplifyGraphqlDefinition.fromString(defaultDDBSchema);

    const amplifyManagedDdbDef = AmplifyGraphqlDefinition.fromString(
      amplifyManagedDDBSchema,
      amplifyManagedDDBDataSource
    );

    const sqlDef = AmplifyGraphqlDefinition.fromString(
      sqlSchema,
      sqlDataSource
    );

    const combinedDef = AmplifyGraphqlDefinition.combine([defaultDdbDef, sqlDef, amplifyManagedDdbDef]);

    expect(combinedDef).toBeDefined();
    expect(combinedDef.schema).toBeDefined();

    expect(combinedDef.schema).toContain('type DefaultDDBModel');
    expect(combinedDef.modelDataSourceDefinitions['DefaultDDBModel']).toEqual(defaultDDBDataSource);

    expect(combinedDef.schema).toContain('type AmplifyManagedModel');
    expect(combinedDef.modelDataSourceDefinitions['AmplifyManagedModel']).toEqual(amplifyManagedDDBDataSource);

    expect(combinedDef.schema).toContain('type SQLModel');
    expect(combinedDef.modelDataSourceDefinitions['SQLModel']).toEqual(sqlDataSource);

  });

});
