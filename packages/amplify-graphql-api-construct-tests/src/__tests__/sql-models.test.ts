import * as path from 'path';
import * as fs from 'fs-extra';
import {
  createNewProjectDir,
  deleteDBInstance,
  deleteDbConnectionConfig,
  deleteProjectDir,
  extractVpcConfigFromDbInstance,
  setupRDSInstanceAndData,
  storeDbConnectionConfig,
} from 'amplify-category-api-e2e-core';
import generator from 'generate-password';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { graphql } from '../graphql-request';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

interface DBDetails {
  endpoint: string;
  port: number;
  dbName: string;
  vpcConfig: {
    vpcId: string;
    securityGroupIds: string[];
    subnetAvailabilityZones: {
      subnetId: string;
      availabilityZone: string;
    }[];
  };
  ssmPaths: {
    hostnameSsmPath: string;
    portSsmPath: string;
    usernameSsmPath: string;
    passwordSsmPath: string;
    databaseNameSsmPath: string;
  };
}

describe('CDK GraphQL Transformer', () => {
  let projRoot: string;
  let projFolderName: string;

  const [username, password, identifier] = generator.generateMultiple(3);

  const region = process.env.AWS_REGION ?? 'us-east-1';

  const dbname = 'default_db';

  let dbDetails: DBDetails;

  beforeAll(async () => {
    dbDetails = await setupDatabase({
      identifier,
      engine: 'mysql',
      dbname,
      username,
      password,
      region,
    });
  });

  afterAll(async () => {
    await cleanupDatabase({ identifier: identifier, region, dbDetails });
  });

  beforeEach(async () => {
    projFolderName = 'sqlmodels';
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    try {
      const result = await cdkDestroy(projRoot, '--all');
      console.log(`cdkDestroy result: ${JSON.stringify(result)}`);
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  [/* '2.80.0', */ 'latest'].forEach((cdkVersion) => {
    test(`SQL Models base case - aws-cdk-lib@${cdkVersion}`, async () => {
      const templatePath = path.resolve(path.join(__dirname, 'backends', 'sql-models'));
      const name = await initCDKProject(projRoot, templatePath, cdkVersion);
      writeDbDetails(dbDetails, projRoot);
      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

      const result = await graphql(
        apiEndpoint,
        apiKey,
        /* GraphQL */ `
          mutation CREATE_TODO {
            createTodo(input: { description: "todo desc" }) {
              id
              description
            }
          }
        `,
      );

      expect(result).toMatchSnapshot({
        body: {
          data: {
            createTodo: {
              id: expect.any(String),
            },
          },
        },
      });

      const todo = result.body.data.createTodo;

      const listResult = await graphql(
        apiEndpoint,
        apiKey,
        /* GraphQL */ `
          query LIST_TODOS {
            listTodos {
              items {
                id
                description
              }
            }
          }
        `,
      );
      expect(listResult).toMatchSnapshot({
        body: {
          data: {
            listTodos: {
              items: [
                {
                  id: expect.any(String),
                },
              ],
            },
          },
        },
      });

      expect(todo.id).toEqual(listResult.body.data.listTodos.items[0].id);
    });
  });
});

const setupDatabase = async (options: {
  identifier: string;
  engine: 'mysql' | 'postgres';
  dbname: string;
  username: string;
  password: string;
  region: string;
}): Promise<DBDetails> => {
  const { identifier, dbname, username, password, region } = options;

  console.log(`Setting up database '${identifier}'`);

  const queries = ['CREATE TABLE todos (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))'];

  const dbConfig = await setupRDSInstanceAndData(options, queries);
  if (!dbConfig) {
    throw new Error('Failed to setup RDS instance');
  }

  const ssmPaths = await storeDbConnectionConfig({
    region,
    pathPrefix: `/${identifier}/test`,
    hostname: dbConfig.endpoint,
    port: dbConfig.port,
    databaseName: dbname,
    username,
    password,
  });
  if (!ssmPaths) {
    throw new Error('Failed to store db connection config');
  }
  console.log(`Stored db connection config in SSM: ${JSON.stringify(ssmPaths)}`);

  return {
    endpoint: dbConfig.endpoint,
    port: dbConfig.port,
    dbName: dbname,
    vpcConfig: extractVpcConfigFromDbInstance(dbConfig.dbInstance),
    ssmPaths,
  };
};

const cleanupDatabase = async (options: { identifier: string; region: string; dbDetails: DBDetails }): Promise<void> => {
  const { identifier, region, dbDetails } = options;
  await deleteDBInstance(identifier, region);

  await deleteDbConnectionConfig({
    region,
    ...dbDetails.ssmPaths,
  });
};

const writeDbDetails = (dbDetails: DBDetails, projRoot: string): void => {
  const detailsStr = JSON.stringify(dbDetails);
  const filePath = path.join(projRoot, 'db-details.json');
  fs.writeFileSync(filePath, detailsStr);
  console.log(`Wrote ${filePath}`);
};
