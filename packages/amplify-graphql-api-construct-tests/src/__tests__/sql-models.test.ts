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
  storeDbConnectionConfigWithSecretsManager,
  deleteDbConnectionConfigWithSecretsManager,
} from 'amplify-category-api-e2e-core';
import { LambdaClient, GetProvisionedConcurrencyConfigCommand } from '@aws-sdk/client-lambda';
import generator from 'generate-password';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { getResourceNamesForStrategyName, SQLLambdaResourceNames } from '@aws-amplify/graphql-transformer-core';
import { isSqlModelDataSourceSecretsManagerDbConnectionConfig } from '@aws-amplify/graphql-transformer-interfaces';
import { SqlModelDataSourceDbConnectionConfig } from '@aws-amplify/graphql-api-construct';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { AuthConstructStackOutputs } from '../types';
import { CognitoIdentityPoolCredentialsFactory } from '../cognito-identity-pool-credentials';
import { assumeIamRole } from '../assume-role';
import { CRUDLTester } from '../crudl-tester';
import { graphql } from '../graphql-request';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

interface DBDetails {
  dbConfig: {
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
  };
  connectionConfigs: {
    [key: string]: SqlModelDataSourceDbConnectionConfig;
  };
}

describe('CDK GraphQL Transformer', () => {
  let projRoot: string;
  let projRootWithIam: string;
  const projFolderName = 'sqlmodelsssm';

  const [username, identifier] = generator.generateMultiple(2);

  const region = process.env.CLI_REGION ?? 'us-west-2';

  const dbname = 'default_db';

  let dbDetails: DBDetails;

  // DO NOT CHANGE THIS VALUE: The test uses it to find resources by name. It is hardcoded in the sql-models backend app
  const strategyName = 'MySqlDBStrategy';
  const resourceNames = getResourceNamesForStrategyName(strategyName);

  let outputs: AuthConstructStackOutputs & any;
  let outputsWithIam: AuthConstructStackOutputs & any;

  let graphqlClientApiKey: AWSAppSyncClient<any>;
  let graphqlClientWithIAMAccessApiKey: AWSAppSyncClient<any>;
  let graphqlClientAuthRole: AWSAppSyncClient<any>;
  let graphqlClientWithIAMAccessAuthRole: AWSAppSyncClient<any>;
  let graphqlClientUnauthRole: AWSAppSyncClient<any>;
  let graphqlClientWithIAMAccessUnauthRole: AWSAppSyncClient<any>;
  let graphqlClientBasicRole: AWSAppSyncClient<any>;
  let graphqlClientWithIAMAccessBasicRole: AWSAppSyncClient<any>;

  beforeAll(async () => {
    projRoot = await createNewProjectDir(projFolderName);
    projRootWithIam = await createNewProjectDir(projFolderName);
    dbDetails = await setupDatabase({
      identifier,
      engine: 'mysql',
      dbname,
      username,
      region,
    });
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'sql-models'));
    const name = await initCDKProject(projRoot, templatePath, {
      additionalDependencies: ['@aws-amplify/auth-construct-alpha@^0.5.6'],
      cdkContext: {
        'enable-iam-authorization-mode': 'false',
      },
    });
    const nameWithIam = await initCDKProject(projRootWithIam, templatePath, {
      additionalDependencies: ['@aws-amplify/auth-construct-alpha@^0.5.6'],
      cdkContext: {
        'enable-iam-authorization-mode': 'true',
      },
    });
    writeDbDetails(dbDetails, projRoot);
    writeDbDetails(dbDetails, projRootWithIam);
    [outputs, outputsWithIam] = await Promise.all([cdkDeploy(projRoot, '--all'), cdkDeploy(projRootWithIam, '--all')]);
    outputs = outputs[name];
    outputsWithIam = outputsWithIam[nameWithIam];

    const cognitoCredentialsFactory = new CognitoIdentityPoolCredentialsFactory(outputs);
    const cognitoRolesCredentials = {
      authRoleCredentials: await cognitoCredentialsFactory.getAuthRoleCredentials(),
      unAuthRoleCredentials: await cognitoCredentialsFactory.getUnAuthRoleCredentials(),
    };
    const cognitoCredentialsWithIamFactory = new CognitoIdentityPoolCredentialsFactory(outputsWithIam);
    const cognitoRolesWithIamCredentials = {
      authRoleCredentials: await cognitoCredentialsWithIamFactory.getAuthRoleCredentials(),
      unAuthRoleCredentials: await cognitoCredentialsWithIamFactory.getUnAuthRoleCredentials(),
    };
    const basicRoleCredentials = await assumeIamRole(outputs.BasicRoleArn);
    const basicRoleWithIamCredentials = await assumeIamRole(outputsWithIam.BasicRoleArn);

    graphqlClientBasicRole = new AWSAppSyncClient({
      url: outputs.awsAppsyncApiEndpoint,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: basicRoleCredentials.AccessKeyId,
          secretAccessKey: basicRoleCredentials.SecretAccessKey,
          sessionToken: basicRoleCredentials.SessionToken,
        },
      },
      disableOffline: true,
    });

    graphqlClientWithIAMAccessBasicRole = new AWSAppSyncClient({
      url: outputsWithIam.awsAppsyncApiEndpoint,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: basicRoleWithIamCredentials.AccessKeyId,
          secretAccessKey: basicRoleWithIamCredentials.SecretAccessKey,
          sessionToken: basicRoleWithIamCredentials.SessionToken,
        },
      },
      disableOffline: true,
    });

    graphqlClientAuthRole = new AWSAppSyncClient({
      url: outputs.awsAppsyncApiEndpoint,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: cognitoRolesCredentials.authRoleCredentials.accessKeyId,
          secretAccessKey: cognitoRolesCredentials.authRoleCredentials.secretAccessKey,
          sessionToken: cognitoRolesCredentials.authRoleCredentials.sessionToken,
        },
      },
      disableOffline: true,
    });

    graphqlClientUnauthRole = new AWSAppSyncClient({
      url: outputs.awsAppsyncApiEndpoint,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: cognitoRolesCredentials.unAuthRoleCredentials.accessKeyId,
          secretAccessKey: cognitoRolesCredentials.unAuthRoleCredentials.secretAccessKey,
          sessionToken: cognitoRolesCredentials.unAuthRoleCredentials.sessionToken,
        },
      },
      disableOffline: true,
    });

    graphqlClientWithIAMAccessAuthRole = new AWSAppSyncClient({
      url: outputsWithIam.awsAppsyncApiEndpoint,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: cognitoRolesWithIamCredentials.authRoleCredentials.accessKeyId,
          secretAccessKey: cognitoRolesWithIamCredentials.authRoleCredentials.secretAccessKey,
          sessionToken: cognitoRolesWithIamCredentials.authRoleCredentials.sessionToken,
        },
      },
      disableOffline: true,
    });

    graphqlClientWithIAMAccessUnauthRole = new AWSAppSyncClient({
      url: outputsWithIam.awsAppsyncApiEndpoint,
      region: region,
      auth: {
        type: AUTH_TYPE.AWS_IAM,
        credentials: {
          accessKeyId: cognitoRolesWithIamCredentials.unAuthRoleCredentials.accessKeyId,
          secretAccessKey: cognitoRolesWithIamCredentials.unAuthRoleCredentials.secretAccessKey,
          sessionToken: cognitoRolesWithIamCredentials.unAuthRoleCredentials.sessionToken,
        },
      },
      disableOffline: true,
    });

    graphqlClientApiKey = new AWSAppSyncClient({
      url: outputs.awsAppsyncApiEndpoint,
      region: region,
      auth: {
        type: AUTH_TYPE.API_KEY,
        apiKey: outputs.awsAppsyncApiKey,
      },
      disableOffline: true,
    });

    graphqlClientWithIAMAccessApiKey = new AWSAppSyncClient({
      url: outputsWithIam.awsAppsyncApiEndpoint,
      region: region,
      auth: {
        type: AUTH_TYPE.API_KEY,
        apiKey: outputsWithIam.awsAppsyncApiKey,
      },
      disableOffline: true,
    });
  });

  afterAll(async () => {
    try {
      await Promise.all([cdkDestroy(projRoot, '--all'), cdkDestroy(projRootWithIam, '--all')]);
    } catch (err) {
      console.log(`Error invoking 'cdk destroy': ${err}`);
    }

    deleteProjectDir(projRoot);
    deleteProjectDir(projRootWithIam);
    await cleanupDatabase({ identifier: identifier, region, dbDetails });
  });

  test('creates a GraphQL API from SQL-based models with Secrets Manager Credential Store default encryption key', async () => {
    await testGraphQLAPI('secretsManager');
  });

  test('creates a GraphQL API from SQL-based models with Secrets Manager Credential Store custom encryption key', async () => {
    await testGraphQLAPI('secretsManagerCustomKey');
  });

  test('creates a GraphQL API from SQL-based models with Secrets Manager Credential Store default encryption key', async () => {
    await testGraphQLAPI('secretsManagerManagedSecret');
  });

  test('creates a GraphQL API from SQL-based models with SSM Credential Store', async () => {
    await testGraphQLAPI('ssm');
  });

  const testGraphQLAPI = async (connectionConfigName: string): Promise<void> => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'sql-models'));
    const name = await initCDKProject(projRoot, templatePath);
    writeDbDetails({ dbConfig: dbDetails.dbConfig, dbConnectionConfig: dbDetails.connectionConfigs[connectionConfigName] }, projRoot);
    const outputs = await cdkDeploy(projRoot, '--all');
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
    const functionName = outputs.SQLFunctionName;
    const command = new GetProvisionedConcurrencyConfigCommand({
      FunctionName: functionName,
      Qualifier: resourceNames.sqlLambdaAliasName,
    });
    const response = await client.send(command);
    expect(response.RequestedProvisionedConcurrentExecutions).toEqual(2);

    await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation DELETE_TODO {
          deleteTodo(input: { id: "${todo.id}" }) {
            id
          }
        }
      `,
    );
    const emptyListResult = await graphql(
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

    expect(emptyListResult.body.data.listTodos.items.length).toEqual(0);
  };

  it('can access Todo', async () => {
    for (const graphqlClient of [graphqlClientApiKey, graphqlClientWithIAMAccessApiKey, graphqlClientWithIAMAccessBasicRole]) {
      await new CRUDLTester(graphqlClient, 'Todo', 'Todos', ['description']).testCanExecuteCRUDLOperations();
    }
  });

  it('cannot access Todo', async () => {
    for (const graphqlClient of [
      graphqlClientAuthRole,
      graphqlClientUnauthRole,
      graphqlClientWithIAMAccessAuthRole,
      graphqlClientWithIAMAccessUnauthRole,
      graphqlClientBasicRole,
    ]) {
      await new CRUDLTester(graphqlClient, 'Todo', 'Todos', ['description']).testDoesNotHaveCRUDLAccess();
    }
  });

  it('can access TodoWithPrivateIam', async () => {
    for (const graphqlClient of [graphqlClientAuthRole, graphqlClientWithIAMAccessAuthRole, graphqlClientWithIAMAccessBasicRole]) {
      await new CRUDLTester(graphqlClient, 'TodoWithPrivateIam', 'TodoWithPrivateIam', ['description']).testCanExecuteCRUDLOperations();
    }
  });

  it('cannot access TodoWithPrivateIam', async () => {
    for (const graphqlClient of [
      graphqlClientUnauthRole,
      graphqlClientWithIAMAccessUnauthRole,
      graphqlClientApiKey,
      graphqlClientWithIAMAccessApiKey,
      graphqlClientBasicRole,
    ]) {
      await new CRUDLTester(graphqlClient, 'TodoWithPrivateIam', 'TodoWithPrivateIam', ['description']).testDoesNotHaveCRUDLAccess();
    }
  });

  it('can access TodoWithPublicIam', async () => {
    for (const graphqlClient of [graphqlClientUnauthRole, graphqlClientWithIAMAccessUnauthRole, graphqlClientWithIAMAccessBasicRole]) {
      await new CRUDLTester(graphqlClient, 'TodoWithPublicIam', 'TodoWithPublicIam', ['description']).testCanExecuteCRUDLOperations();
    }
  });

  it('cannot access TodoWithPublicIam', async () => {
    for (const graphqlClient of [
      graphqlClientAuthRole,
      graphqlClientWithIAMAccessAuthRole,
      graphqlClientApiKey,
      graphqlClientWithIAMAccessApiKey,
      graphqlClientBasicRole,
    ]) {
      await new CRUDLTester(graphqlClient, 'TodoWithPublicIam', 'TodoWithPublicIam', ['description']).testDoesNotHaveCRUDLAccess();
    }
  });

  it('can access TodoWithNoAuthDirective', async () => {
    for (const graphqlClient of [graphqlClientApiKey, graphqlClientWithIAMAccessApiKey, graphqlClientWithIAMAccessBasicRole]) {
      await new CRUDLTester(graphqlClient, 'TodoWithNoAuthDirective', 'TodoWithNoAuthDirectives', [
        'description',
      ]).testCanExecuteCRUDLOperations();
    }
  });

  it('cannot access TodoWithNoAuthDirective', async () => {
    for (const graphqlClient of [
      graphqlClientAuthRole,
      graphqlClientUnauthRole,
      graphqlClientWithIAMAccessAuthRole,
      graphqlClientWithIAMAccessUnauthRole,
      graphqlClientBasicRole,
    ]) {
      await new CRUDLTester(graphqlClient, 'TodoWithNoAuthDirective', 'TodoWithNoAuthDirectives', [
        'description',
      ]).testDoesNotHaveCRUDLAccess();
    }
  });

  it('can access TodoWithPrivateField', async () => {
    for (const graphqlClient of [graphqlClientAuthRole, graphqlClientWithIAMAccessAuthRole, graphqlClientWithIAMAccessBasicRole]) {
      await new CRUDLTester(graphqlClient, 'TodoWithPrivateField', 'TodoWithPrivateFields', [
        'description',
      ]).testCanExecuteCRUDLOperations();
    }
    for (const graphqlClient of [graphqlClientAuthRole, graphqlClientWithIAMAccessAuthRole, graphqlClientWithIAMAccessBasicRole]) {
      await new CRUDLTester(graphqlClient, 'TodoWithPrivateField', 'TodoWithPrivateFields', [
        'description',
        'secret',
      ]).testCanExecuteCRUDLOperations();
    }
    for (const graphqlClient of [graphqlClientUnauthRole, graphqlClientWithIAMAccessUnauthRole]) {
      // unauth role has access to non-secret fields, but can't delete.
      await new CRUDLTester(graphqlClient, 'TodoWithPrivateField', 'TodoWithPrivateFields', ['description']).testCanExecuteCRUDLOperations({
        skipDelete: true,
      });
    }
  });

  it('cannot access TodoWithPrivateField', async () => {
    await new CRUDLTester(graphqlClientBasicRole, 'TodoWithPrivateField', 'TodoWithPrivateFields', [
      'description',
    ]).testDoesNotHaveCRUDLAccess();
    await new CRUDLTester(graphqlClientBasicRole, 'TodoWithPrivateField', 'TodoWithPrivateFields', [
      'description',
      'secret',
    ]).testDoesNotHaveCRUDLAccess();

    for (const graphqlClient of [graphqlClientUnauthRole, graphqlClientWithIAMAccessUnauthRole]) {
      // unauth role doesn't have access to secret field
      await new CRUDLTester(graphqlClient, 'TodoWithPrivateField', 'TodoWithPrivateFields', [
        'description',
        'secret',
      ]).testDoesNotHaveCRUDLAccess({
        // field auth rules need real item to be created otherwise they return null instead of failing. this is tested below.
        skipGet: true,
      });
    }

    for (const [authorizedClient, unauthorizedClient] of [
      [graphqlClientAuthRole, graphqlClientUnauthRole],
      [graphqlClientWithIAMAccessAuthRole, graphqlClientWithIAMAccessUnauthRole],
    ]) {
      const itemId = await new CRUDLTester(authorizedClient, 'TodoWithPrivateField', 'TodoWithPrivateFields', [
        'description',
        'secret',
      ]).testCanExecuteCreate();
      await new CRUDLTester(unauthorizedClient, 'TodoWithPrivateField', 'TodoWithPrivateFields', [
        'description',
        'secret',
      ]).testDoesNotHaveReadAccess(itemId);
    }
  });
});

const setupDatabase = async (options: {
  identifier: string;
  engine: 'mysql' | 'postgres';
  dbname: string;
  username: string;
  region: string;
}): Promise<DBDetails> => {
  const { identifier, dbname, username, region } = options;

  console.log(`Setting up database '${identifier}'`);

  const queries = [
    'CREATE TABLE todos (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))',
    'CREATE TABLE todosWithPrivateIam (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))',
    'CREATE TABLE todosWithPublicIam (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))',
    'CREATE TABLE todosWithNoAuthDirective (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))',
    'CREATE TABLE todosWithPrivateField (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256), secret VARCHAR(256))',
  ];

  const dbConfig = await setupRDSInstanceAndData(options, queries);
  if (!dbConfig) {
    throw new Error('Failed to setup RDS instance');
  }

  const { secretArn } = await storeDbConnectionConfigWithSecretsManager({
    region,
    username,
    password: dbConfig.password,
    secretName: `${identifier}-secret`,
  });
  if (!secretArn) {
    throw new Error('Failed to store db connection config for secrets manager');
  }
  const dbConnectionConfigSecretsManager = {
    databaseName: dbname,
    hostname: dbConfig.endpoint,
    port: dbConfig.port,
    secretArn,
  };
  console.log(`Stored db connection config in Secrets manager: ${JSON.stringify(dbConnectionConfigSecretsManager)}`);

  const { secretArn: secretArnWithCustomKey, keyArn } = await storeDbConnectionConfigWithSecretsManager({
    region,
    username,
    password: dbConfig.password,
    secretName: `${identifier}-secret-custom-key`,
    useCustomEncryptionKey: true,
  });
  if (!secretArnWithCustomKey) {
    throw new Error('Failed to store db connection config for secrets manager');
  }
  const dbConnectionConfigSecretsManagerCustomKey = {
    databaseName: dbname,
    hostname: dbConfig.endpoint,
    port: dbConfig.port,
    secretArn: secretArnWithCustomKey,
    keyArn,
  };
  console.log(`Stored db connection config in Secrets manager: ${JSON.stringify(dbConnectionConfigSecretsManagerCustomKey)}`);

  const dbConnectionConfigSSM = await storeDbConnectionConfig({
    region,
    pathPrefix: `/${identifier}/test`,
    hostname: dbConfig.endpoint,
    port: dbConfig.port,
    databaseName: dbname,
    username,
    password: dbConfig.password,
  });
  if (!dbConnectionConfigSSM) {
    throw new Error('Failed to store db connection config for SSM');
  }
  console.log(`Stored db connection config in SSM: ${JSON.stringify(dbConnectionConfigSSM)}`);

  return {
    dbConfig: {
      endpoint: dbConfig.endpoint,
      port: dbConfig.port,
      dbName: dbname,
      vpcConfig: extractVpcConfigFromDbInstance(dbConfig.dbInstance),
    },
    connectionConfigs: {
      ssm: dbConnectionConfigSSM,
      secretsManager: dbConnectionConfigSecretsManager,
      secretsManagerCustomKey: dbConnectionConfigSecretsManagerCustomKey,
      secretsManagerManagedSecret: {
        databaseName: dbname,
        hostname: dbConfig.endpoint,
        port: dbConfig.port,
        secretArn: dbConfig.managedSecretArn,
      },
    },
  };
};

const cleanupDatabase = async (options: { identifier: string; region: string; dbDetails: DBDetails }): Promise<void> => {
  const { identifier, region, dbDetails } = options;
  await deleteDBInstance(identifier, region);

  const { connectionConfigs } = dbDetails;

  await Promise.all(
    Object.values(connectionConfigs).map((dbConnectionConfig) => {
      if (isSqlModelDataSourceSecretsManagerDbConnectionConfig(dbConnectionConfig)) {
        return deleteDbConnectionConfigWithSecretsManager({
          region,
          secretArn: dbConnectionConfig.secretArn,
        });
      } else {
        return deleteDbConnectionConfig({
          region,
          hostnameSsmPath: dbConnectionConfig.hostnameSsmPath,
          portSsmPath: dbConnectionConfig.portSsmPath,
          usernameSsmPath: dbConnectionConfig.usernameSsmPath,
          passwordSsmPath: dbConnectionConfig.passwordSsmPath,
          databaseNameSsmPath: dbConnectionConfig.databaseNameSsmPath,
        });
      }
    }),
  );
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
const writeDbDetails = (
  dbDetails: Omit<DBDetails, 'connectionConfigs'> & { dbConnectionConfig: SqlModelDataSourceDbConnectionConfig },
  projRoot: string,
): void => {
  const detailsStr = JSON.stringify(dbDetails);
  const filePath = path.join(projRoot, 'db-details.json');
  fs.writeFileSync(filePath, detailsStr);
  console.log(`Wrote ${filePath}`);
};
