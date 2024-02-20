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
import { LambdaClient, GetProvisionedConcurrencyConfigCommand } from '@aws-sdk/client-lambda';
import generator from 'generate-password';
import { getResourceNamesForStrategyName } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { graphql } from '../graphql-request';

jest.setTimeout(1000 * 60 * 120 /* 2 hours */);

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
  const projFolderName = 'sqlmodels';

  const [username, password, identifier] = generator.generateMultiple(3);

  const region = process.env.CLI_REGION ?? 'us-west-2';

  const dbname = 'default_db';

  let dbDetails: DBDetails;

  // DO NOT CHANGE THIS VALUE: The test uses it to find resources by name. It is hardcoded in the sql-models backend app
  const strategyName = 'MySqlDBStrategy';
  const resourceNames = getResourceNamesForStrategyName(strategyName);

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
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (err) {
      console.log(`Error invoking 'cdk destroy': ${err}`);
    }

    deleteProjectDir(projRoot);
  });

  it('creates a GraphQL API from SQL-based models', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'sql-models'));
    const name = await initCDKProject(projRoot, templatePath);
    writeDbDetails(dbDetails, projRoot);
    // Between the SQL Layer custom resource, Codegen asset auto delete custom resource, Codegen asset bucket deployment, and Lambda layer
    // provisioned concurrency, this test doesn't produce output frequently enough to keep nexpect happy. The test itself appears to be
    // stable, but we'll increase the timeout to account for slower deployment times in CICD.
    const outputs = await cdkDeploy(projRoot, '--all', { timeoutMs: 120 * 60 * 1000 });
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

    const description = 'todo description';

    const result = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_TODO {
          createTodo(input: { description: "${description}" }) {
            id
            description
          }
        }
      `,
    );

    const todo = result.body.data.createTodo;
    expect(todo).toBeDefined();
    expect(todo.id).toBeDefined();
    expect(todo.description).toEqual(description);

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

    expect(listResult.body.data.listTodos.items.length).toEqual(1);
    expect(todo.id).toEqual(listResult.body.data.listTodos.items[0].id);
    const client = new LambdaClient({ region });
    const functionName = outputs[name].SQLFunctionName;
    const command = new GetProvisionedConcurrencyConfigCommand({
      FunctionName: functionName,
      Qualifier: resourceNames.sqlLambdaAliasName,
    });
    const response = await client.send(command);
    expect(response.RequestedProvisionedConcurrentExecutions).toEqual(2);
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

/**
 * Writes the specified DB details to a file named `db-details.json` in the specified directory. Used to pass db configs from setup code to
 * the CDK app under test.
 *
 * **NOTE** Do not call this until the CDK project is initialized: `cdk init` fails if the working directory is not empty.
 *
 * @param dbDetails the details object
 * @param projRoot the destination directory to write the `db-details.json` file to
 */
const writeDbDetails = (dbDetails: DBDetails, projRoot: string): void => {
  const detailsStr = JSON.stringify(dbDetails);
  const filePath = path.join(projRoot, 'db-details.json');
  fs.writeFileSync(filePath, detailsStr);
  console.log(`Wrote ${filePath}`);
};
