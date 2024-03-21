import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { gql } from 'graphql-transformer-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { AuthConstructStackOutputs } from '../types';
import { CognitoIdentityPoolCredentialsFactory } from '../cognito-identity-pool-credentials';
import { assumeIamRole } from '../assume-role';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK DDB Iam Access', () => {
  let projRoot: string;
  let projRootWithIam: string;
  const projFolderName = 'ddbmodels';

  const region = process.env.CLI_REGION ?? 'us-west-2';

  let outputs: AuthConstructStackOutputs & any;
  let outputsWithIam: AuthConstructStackOutputs & any;

  let graphqlClientAuthRole: AWSAppSyncClient<any>;
  let graphqlClientWithIAMAccessAuthRole: AWSAppSyncClient<any>;
  let graphqlClientUnauthRole: AWSAppSyncClient<any>;
  let graphqlClientWithIAMAccessUnauthRole: AWSAppSyncClient<any>;
  let graphqlClientBasicRole: AWSAppSyncClient<any>;
  let graphqlClientWithIAMAccessBasicRole: AWSAppSyncClient<any>;

  beforeAll(async () => {
    projRoot = await createNewProjectDir(projFolderName);
    projRootWithIam = await createNewProjectDir(projFolderName);
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'ddb-iam-access'));
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
  });

  afterAll(async () => {
    try {
      await Promise.all([cdkDestroy(projRoot, '--all'), cdkDestroy(projRootWithIam, '--all')]);
    } catch (err) {
      console.log(`Error invoking 'cdk destroy': ${err}`);
    }

    deleteProjectDir(projRoot);
    deleteProjectDir(projRootWithIam);
  });

  it('can access TodoWithPrivateIam', async () => {
    for (const graphqlClient of [graphqlClientAuthRole, graphqlClientWithIAMAccessAuthRole, graphqlClientWithIAMAccessBasicRole]) {
      await testHasCRUDLAccess(graphqlClient, 'TodoWithPrivateIam');
    }
  });

  it('cannot access TodoWithPrivateIam', async () => {
    for (const graphqlClient of [graphqlClientUnauthRole, graphqlClientWithIAMAccessUnauthRole, graphqlClientBasicRole]) {
      await testDoesNotHaveCRUDLAccess(graphqlClient, 'TodoWithPrivateIam');
    }
  });

  it('can access TodoWithPublicIam', async () => {
    for (const graphqlClient of [graphqlClientUnauthRole, graphqlClientWithIAMAccessUnauthRole, graphqlClientWithIAMAccessBasicRole]) {
      await testHasCRUDLAccess(graphqlClient, 'TodoWithPublicIam');
    }
  });

  it('cannot access TodoWithPublicIam', async () => {
    for (const graphqlClient of [graphqlClientAuthRole, graphqlClientWithIAMAccessAuthRole, graphqlClientBasicRole]) {
      await testDoesNotHaveCRUDLAccess(graphqlClient, 'TodoWithPublicIam');
    }
  });

  it('can access TodoWithNoAuthDirective', async () => {
    for (const graphqlClient of [graphqlClientWithIAMAccessBasicRole]) {
      await testHasCRUDLAccess(graphqlClient, 'TodoWithNoAuthDirective', 'TodoWithNoAuthDirectives');
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
      await testDoesNotHaveCRUDLAccess(graphqlClient, 'TodoWithNoAuthDirective', 'TodoWithNoAuthDirectives');
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
