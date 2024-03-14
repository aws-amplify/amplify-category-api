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
import { AdminCreateUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { LambdaClient, GetProvisionedConcurrencyConfigCommand } from '@aws-sdk/client-lambda';
import { AssumeRoleCommand, Credentials, STSClient } from '@aws-sdk/client-sts';
import generator from 'generate-password';
import { getResourceNamesForStrategyName } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { graphql } from '../graphql-request';
import Amplify, { Auth } from 'aws-amplify';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { gql } from 'graphql-transformer-core';

import { ICredentials } from '@aws-amplify/core';

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
  let projRootWithIam: string;
  const projFolderName = 'sqlmodels';

  const [username, password, identifier] = generator.generateMultiple(3);

  const region = process.env.CLI_REGION ?? 'us-west-2';

  const dbname = 'default_db';

  let dbDetails: DBDetails;

  // DO NOT CHANGE THIS VALUE: The test uses it to find resources by name. It is hardcoded in the sql-models backend app
  const strategyName = 'MySqlDBStrategy';
  const resourceNames = getResourceNamesForStrategyName(strategyName);
  let outputs: any;
  let outputsWithIam: any;

  let graphqlClientApiKey: AWSAppSyncClient<any>;
  let graphqlClientWithIAMAccessApiKey: AWSAppSyncClient<any>;
  let graphqlClientAuthRole: AWSAppSyncClient<any>;
  let graphqlClientWithIAMAccessAuthRole: AWSAppSyncClient<any>;
  let graphqlClientUnauthRole: AWSAppSyncClient<any>;
  let graphqlClientWithIAMAccessUnauthRole: AWSAppSyncClient<any>;
  let graphqlClientBasicRole: AWSAppSyncClient<any>;
  let graphqlClientWithIAMAccessBasicRole: AWSAppSyncClient<any>;

  beforeAll(async () => {
    // projRoot = await createNewProjectDir(projFolderName);
    // projRootWithIam = await createNewProjectDir(projFolderName);
    // dbDetails = await setupDatabase({
    //   identifier,
    //   engine: 'mysql',
    //   dbname,
    //   username,
    //   password,
    //   region,
    // });
    // const templatePath = path.resolve(path.join(__dirname, 'backends', 'sql-models'));
    // const name = await initCDKProject(projRoot, templatePath, { additionalDependencies: ['@aws-amplify/auth-construct-alpha@^0.5.6'] });
    // const nameWithIam = await initCDKProject(projRootWithIam, templatePath, {
    //   additionalDependencies: ['@aws-amplify/auth-construct-alpha@^0.5.6'],
    // });
    // writeDbDetails(dbDetails, projRoot);
    // writeDbDetails(dbDetails, projRootWithIam);
    // [outputs, outputsWithIam] = await Promise.all([
    //   cdkDeploy(projRoot, '--all'),
    //   cdkDeploy(projRootWithIam, '--all', {
    //     env: {
    //       ENABLE_IAM_AUTHORIZATION_MODE: 'true',
    //     },
    //   }),
    // ]);
    // outputs = outputs[name];
    // outputsWithIam = outputsWithIam[nameWithIam];
    outputs = {
      awsAppsyncApiEndpoint: 'https://2wucfjuj3bfdvingogkumuhm4q.appsync-api.us-west-2.amazonaws.com/graphql',
      awsAppsyncApiKey: 'da2-gumlqsigrjgqlngyjjotudtjje',
      SQLFunctionName: 'sqlmodels-cb8ebc008-2e13e-SQLFunctionMySqlDBStrate-ib5qyheXUf9Z',
      userPoolId: 'us-west-2_xEn9prd48',
      webClientId: '7695j4ntc41i6achtd3s91rjfb',
      identityPoolId: 'us-west-2:eb703d71-c3a6-4954-b10d-7066c1a7eff9',
      authRegion: 'us-west-2',
      BasicRoleArn: 'arn:aws:iam::595032847868:role/sqlmodels-cb8ebc008-2e13ed23-BasicRole0C9C42EF-ZiidazdKoIcy',
    };
    outputsWithIam = {
      awsAppsyncApiEndpoint: 'https://e64rivmzezdohdj2gjg6paiozi.appsync-api.us-west-2.amazonaws.com/graphql',
      awsAppsyncApiKey: 'da2-733eyvevdrhyflc2sewfscjyca',
      userPoolId: 'us-west-2_8ET42t87v',
      webClientId: '461og1qs4ru5fmrbkko8jkgv7c',
      identityPoolId: 'us-west-2:cd782ca8-3ed5-4929-831b-b3ce432e6072',
      authRegion: 'us-west-2',
      BasicRoleArn: 'arn:aws:iam::595032847868:role/sqlmodels-cb8ebc008-c4913162-BasicRole0C9C42EF-eKU3F41RZLgv',
    };

    const cognitoRolesCredentials = await getCognitoIamCredentials(outputs);
    const cognitoRolesWithIamCredentials = await getCognitoIamCredentials(outputsWithIam);
    const basicRoleCredentials = await getBasicRoleCredentials(outputs);
    const basicRoleWithIamCredentials = await getBasicRoleCredentials(outputsWithIam);

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
          accessKeyId: cognitoRolesCredentials.unauthRoleCredentials.accessKeyId,
          secretAccessKey: cognitoRolesCredentials.unauthRoleCredentials.secretAccessKey,
          sessionToken: cognitoRolesCredentials.unauthRoleCredentials.sessionToken,
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
          accessKeyId: cognitoRolesWithIamCredentials.unauthRoleCredentials.accessKeyId,
          secretAccessKey: cognitoRolesWithIamCredentials.unauthRoleCredentials.secretAccessKey,
          sessionToken: cognitoRolesWithIamCredentials.unauthRoleCredentials.sessionToken,
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
    // try {
    //   await Promise.all([cdkDestroy(projRoot, '--all'), cdkDestroy(projRootWithIam, '--all')]);
    // } catch (err) {
    //   console.log(`Error invoking 'cdk destroy': ${err}`);
    // }
    //
    // deleteProjectDir(projRoot);
    // deleteProjectDir(projRootWithIam);
    // await cleanupDatabase({ identifier: identifier, region, dbDetails });
  });

  it('creates a GraphQL API from SQL-based models', async () => {
    const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs;

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

    expect(listResult.body.data.listTodos.items.length).toBeGreaterThanOrEqual(1);
    const client = new LambdaClient({ region });
    const functionName = outputs.SQLFunctionName;
    const command = new GetProvisionedConcurrencyConfigCommand({
      FunctionName: functionName,
      Qualifier: resourceNames.sqlLambdaAliasName,
    });
    const response = await client.send(command);
    expect(response.RequestedProvisionedConcurrentExecutions).toEqual(2);
  });

  it('can access Todo', async () => {
    for (const graphqlClient of [
      graphqlClientApiKey,
      graphqlClientWithIAMAccessApiKey,
      graphqlClientWithIAMAccessBasicRole]) {
      await testHasCRUDLAccess(graphqlClient, 'Todo', 'Todos');
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
      await testDoesNotHaveCRUDLAccess(graphqlClient, 'Todo', 'Todos');
    }
  });

  it('can access TodoWithPrivateIam', async () => {
    for (const graphqlClient of [graphqlClientAuthRole, graphqlClientWithIAMAccessAuthRole, graphqlClientWithIAMAccessBasicRole]) {
      await testHasCRUDLAccess(graphqlClient, 'TodoWithPrivateIam');
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
      await testDoesNotHaveCRUDLAccess(graphqlClient, 'TodoWithPrivateIam');
    }
  });

  it('can access TodoWithPublicIam', async () => {
    for (const graphqlClient of [graphqlClientUnauthRole, graphqlClientWithIAMAccessUnauthRole, graphqlClientWithIAMAccessBasicRole]) {
      await testHasCRUDLAccess(graphqlClient, 'TodoWithPublicIam');
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
      await testDoesNotHaveCRUDLAccess(graphqlClient, 'TodoWithPublicIam');
    }
  });
});

const testHasCRUDLAccess = async (graphqlClient: AWSAppSyncClient<any>, modelName: string, modelListName?: string): Promise<void> => {
  if (!modelListName) {
    modelListName = modelName;
  }
  const createResponse = (await graphqlClient.mutate({
    mutation: gql`
          mutation {
            create${modelName}(input: { description: "some description" }) {
              id
              description
            }
          }
        `,
    fetchPolicy: 'no-cache',
  })) as any;
  expect(createResponse.data[`create${modelName}`].id).toBeTruthy();
  expect(createResponse.data[`create${modelName}`].description).toBeTruthy();

  const listResponse = (await graphqlClient.query({
    query: gql`
          query {
            list${modelListName} {
              items {
                id
                description
              }
            }
          }
        `,
    fetchPolicy: 'no-cache',
  })) as any;
  expect(listResponse.data[`list${modelListName}`].items.length).toBeGreaterThan(0);

  const sampleItemId = createResponse.data[`create${modelName}`].id;
  const getResponse = (await graphqlClient.query({
    query: gql`
          query {
            get${modelName}(id: "${sampleItemId}") {
              id
              description
            }
          }
        `,
    fetchPolicy: 'no-cache',
  })) as any;
  expect(getResponse.data[`get${modelName}`].id).toBeTruthy();
  expect(getResponse.data[`get${modelName}`].description).toBeTruthy();

  const updateResponse = (await graphqlClient.mutate({
    mutation: gql`
          mutation {
            update${modelName}(input: { id: "${sampleItemId}", description: "some updated description" }) {
              id
              description
            }
          }
        `,
    fetchPolicy: 'no-cache',
  })) as any;
  expect(updateResponse.data[`update${modelName}`].id).toBeTruthy();
  expect(updateResponse.data[`update${modelName}`].description).toBeTruthy();

  const deleteResponse = (await graphqlClient.mutate({
    mutation: gql`
          mutation {
            delete${modelName}(input: { id: "${sampleItemId}" }) {
              id
              description
            }
          }
        `,
    fetchPolicy: 'no-cache',
  })) as any;

  expect(deleteResponse.data[`delete${modelName}`].id).toBeTruthy();
  expect(deleteResponse.data[`delete${modelName}`].description).toBeTruthy();
};

const testDoesNotHaveCRUDLAccess = async (
  graphqlClient: AWSAppSyncClient<any>,
  modelName: string,
  modelListName?: string,
): Promise<void> => {
  if (!modelListName) {
    modelListName = modelName;
  }
  await expect(
    graphqlClient.mutate({
      mutation: gql`
          mutation {
            create${modelName}(input: { description: "some description" }) {
              id
              description
            }
          }
        `,
      fetchPolicy: 'no-cache',
    }),
  ).rejects.toThrowError(
    /GraphQL error: Not Authorized to access .* on type Mutation|Network error: Response not successful: Received status code 401/,
  );

  await expect(
    graphqlClient.query({
      query: gql`
          query {
            list${modelListName} {
              items {
                id
                description
              }
            }
          }
        `,
      fetchPolicy: 'no-cache',
    }),
  ).rejects.toThrowError(
    /GraphQL error: Not Authorized to access .* on type Query|Network error: Response not successful: Received status code 401/,
  );

  await expect(
    graphqlClient.query({
      query: gql`
          query {
            get${modelName}(id: "some-id") {
              id
              description
            }
          }
        `,
      fetchPolicy: 'no-cache',
    }),
  ).rejects.toThrowError(
    /GraphQL error: Not Authorized to access .* on type Query|Network error: Response not successful: Received status code 401/,
  );

  await expect(
    graphqlClient.mutate({
      mutation: gql`
          mutation {
            update${modelName}(input: { id: "some-id", description: "some updated description" }) {
              id
              description
            }
          }
        `,
      fetchPolicy: 'no-cache',
    }),
  ).rejects.toThrowError(
    /GraphQL error: Not Authorized to access .* on type Mutation|Network error: Response not successful: Received status code 401/,
  );

  await expect(
    graphqlClient.mutate({
      mutation: gql`
          mutation {
            delete${modelName}(input: { id: "some-id" }) {
              id
              description
            }
          }
        `,
      fetchPolicy: 'no-cache',
    }),
  ).rejects.toThrowError(
    /GraphQL error: Not Authorized to access .* on type Mutation|Network error: Response not successful: Received status code 401/,
  );
};

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

  const queries = [
    'CREATE TABLE todos (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))',
    'CREATE TABLE todosWithPrivateIam (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))',
    'CREATE TABLE todosWithPublicIam (id VARCHAR(40) PRIMARY KEY, description VARCHAR(256))',
  ];

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

/**
 * Obtains credentials for auth and unauth roles associated with Cognito Identity Pool
 */
const getCognitoIamCredentials = async (
  outputs: any,
): Promise<{
  authRoleCredentials: ICredentials;
  unauthRoleCredentials: ICredentials;
}> => {
  const username = 'user@test.com';
  const tmpPassword = 'Password123!';
  const realPassword = 'Password1234!';

  const { authRegion, userPoolId, webClientId, identityPoolId } = outputs;

  const cognitoClient = new CognitoIdentityProviderClient({ region: authRegion });

  // await cognitoClient.send(
  //   new AdminCreateUserCommand({
  //     UserPoolId: userPoolId,
  //     UserAttributes: [{ Name: 'email', Value: username }],
  //     Username: username,
  //     TemporaryPassword: tmpPassword,
  //     DesiredDeliveryMediums: [],
  //     MessageAction: 'SUPPRESS',
  //   }),
  // );

  Amplify.configure({
    Auth: {
      region: authRegion,
      userPoolId: userPoolId,
      userPoolWebClientId: webClientId,
      identityPoolId: identityPoolId,
    },
  });

  // const signInResult = await Auth.signIn(username, tmpPassword);
  //
  // if (signInResult.challengeName === 'NEW_PASSWORD_REQUIRED') {
  //   const { requiredAttributes } = signInResult.challengeParam;
  //
  //   await Auth.completeNewPassword(signInResult, realPassword, requiredAttributes);
  // }

  await Auth.signIn(username, realPassword);

  const userCredentials = await Auth.currentCredentials();
  await Auth.signOut();
  const unauthCredentials = await Auth.currentCredentials();
  return { authRoleCredentials: userCredentials, unauthRoleCredentials: unauthCredentials };
};

const getBasicRoleCredentials = async (outputs: any): Promise<Credentials> => {
  const { BasicRoleArn } = outputs;
  const sts = new STSClient({});
  const basicRoleCredentials = (
    await sts.send(
      new AssumeRoleCommand({
        RoleArn: BasicRoleArn,
        RoleSessionName: Date.now().toString(),
        DurationSeconds: 3600,
      }),
    )
  ).Credentials;
  return basicRoleCredentials;
};
