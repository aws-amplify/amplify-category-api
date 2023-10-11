import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { IVpc, Vpc } from 'aws-cdk-lib/aws-ec2';
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyGraphqlDefinition } from '../amplify-graphql-definition';
import { GraphqlApiDefinitionDbConnectionConfig, GraphqlApiDefinitionDbVpcConfig, IAmplifySqlBoundGraphqlApiDefinition } from '../types';
import { AmplifySqlBoundGraphqlApiDefinition } from '../sql-bound-graphql-api-definition';

const TEST_SCHEMA = /* GraphQL */ `
  type Todo @model {
    id: ID!
    content: String!
  }
`;

const mockVpc = (): IVpc => {
  const app = new App();
  const mockStack = new Stack(app, 'mockStack');
  const vpc = Vpc.fromVpcAttributes(mockStack, 'mockVpc', {
    vpcId: 'vpc-1234abcd',
    availabilityZones: ['az1'],
  });
  return vpc;
};

const mockVpcConfig = (): GraphqlApiDefinitionDbVpcConfig => {
  return {
    vpc: mockVpc(),
    securityGroupIds: ['sg-123'],
    subnetIds: ['subnet-123'],
  };
};

const mockDbConfig = (): GraphqlApiDefinitionDbConnectionConfig => {
  return {
    hostnameSsmPath: '/ssm/path/hostnameSsmPath',
    portSsmPath: '/ssm/path/portSsmPath',
    usernameSsmPath: '/ssm/path/usernameSsmPath',
    passwordSsmPath: '/ssm/path/passwordSsmPath',
    databaseNameSsmPath: '/ssm/path/databaseNameSsmPath',
  };
};

describe('AmplifyGraphqlDefinition', () => {
  describe('fromSqlSchemaFiles', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync('fromSqlSchemaFiles');
    });

    afterEach(() => {
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir, { recursive: true });
    });

    it('extracts the definition from a single SQL schema file', () => {
      const schemaFilePath = path.join(tmpDir, 'schema.sql.graphql');

      fs.writeFileSync(schemaFilePath, TEST_SCHEMA);
      const definition = AmplifyGraphqlDefinition.fromSqlSchemaFiles(
        {
          engineType: 'mysql',
          dbConnectionConfig: mockDbConfig(),
          vpcConfig: mockVpcConfig(),
        },
        schemaFilePath,
      );
      expect(definition).toBeInstanceOf(AmplifySqlBoundGraphqlApiDefinition);
      expect(definition.schema).toEqual(TEST_SCHEMA);
    });

    it('extracts the definition from multiple SQL schema files, appended in-order', () => {
      const schema2 = /* GraphQL */ `
        type Blog @model {
          id: ID!
          posts: [Post] @hasMany
        }

        type Post @model {
          id: ID!
          blog: Blog @belongsTo
        }
      `;
      const schema1FilePath = path.join(tmpDir, 'schema.1.graphql');
      const schema2FilePath = path.join(tmpDir, 'schema.2.graphql');
      fs.writeFileSync(schema1FilePath, TEST_SCHEMA);
      fs.writeFileSync(schema2FilePath, schema2);
      const definition = AmplifyGraphqlDefinition.fromSqlSchemaFiles(
        {
          engineType: 'mysql',
          dbConnectionConfig: mockDbConfig(),
          vpcConfig: mockVpcConfig(),
        },
        schema1FilePath,
        schema2FilePath,
      );
      expect(definition).toBeInstanceOf(AmplifySqlBoundGraphqlApiDefinition);
      expect(definition.schema).toEqual(`${TEST_SCHEMA}${os.EOL}${schema2}`);
    });

    it('extracts the definition including custom SQL queries', () => {
      const schema = /* GraphQL */ `
        type Todo @model {
          id: ID!
          content: String!
        }
        type Query {
          noop1(searchTerm: String!): [Int] @sql(reference: "noop1")
          noop2(searchTerm: String!): [Int] @sql(reference: "noop2")
        }
      `;
      const schemaFilePath = path.join(tmpDir, 'schema.sql.graphql');
      fs.writeFileSync(schemaFilePath, schema);

      const sqlStmt1 = 'SELECT 1;';
      const sqlStmt1FilePath = path.join(tmpDir, 'noop1.sql');
      fs.writeFileSync(sqlStmt1FilePath, sqlStmt1);

      const sqlStmt2 = 'SELECT 2;';
      const sqlStmt2FilePath = path.join(tmpDir, 'noop2.sql');
      fs.writeFileSync(sqlStmt2FilePath, sqlStmt2);

      const definition = AmplifyGraphqlDefinition.fromSqlSchemaFiles(
        {
          customSqlFiles: {
            noop1: sqlStmt1FilePath,
            noop2: sqlStmt2FilePath,
          },
          engineType: 'mysql',
          dbConnectionConfig: mockDbConfig(),
          vpcConfig: mockVpcConfig(),
        },
        schemaFilePath,
      ) as IAmplifySqlBoundGraphqlApiDefinition;
      expect(definition).toBeInstanceOf(AmplifySqlBoundGraphqlApiDefinition);
      expect(definition.schema).toEqual(schema);
      expect(definition.customSqlStatements).toBeDefined();
      expect(Object.keys(definition.customSqlStatements!).length).toBe(2);
      expect(definition.customSqlStatements?.noop1).toEqual(sqlStmt1);
      expect(definition.customSqlStatements?.noop2).toEqual(sqlStmt2);
    });
  });
});
