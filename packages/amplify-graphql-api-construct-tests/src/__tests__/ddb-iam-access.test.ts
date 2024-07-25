import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { AuthConstructStackOutputs } from '../types';
import { CognitoIdentityPoolCredentialsFactory } from '../cognito-identity-pool-credentials';
import { assumeIamRole } from '../assume-role';
import { CRUDLTester } from '../crudl-tester';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

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
      await new CRUDLTester(graphqlClient, 'TodoWithPrivateIam', 'TodoWithPrivateIam', ['description']).testCanExecuteCRUDLOperations();
    }
  });

  it('cannot access TodoWithPrivateIam', async () => {
    for (const graphqlClient of [graphqlClientUnauthRole, graphqlClientWithIAMAccessUnauthRole, graphqlClientBasicRole]) {
      await new CRUDLTester(graphqlClient, 'TodoWithPrivateIam', 'TodoWithPrivateIam', ['description']).testDoesNotHaveCRUDLAccess();
    }
  });

  it('can access TodoWithPublicIam', async () => {
    for (const graphqlClient of [graphqlClientUnauthRole, graphqlClientWithIAMAccessUnauthRole, graphqlClientWithIAMAccessBasicRole]) {
      await new CRUDLTester(graphqlClient, 'TodoWithPublicIam', 'TodoWithPublicIam', ['description']).testCanExecuteCRUDLOperations();
    }
  });

  it('cannot access TodoWithPublicIam', async () => {
    for (const graphqlClient of [graphqlClientAuthRole, graphqlClientWithIAMAccessAuthRole, graphqlClientBasicRole]) {
      await new CRUDLTester(graphqlClient, 'TodoWithPublicIam', 'TodoWithPublicIam', ['description']).testDoesNotHaveCRUDLAccess();
    }
  });

  it('can access TodoWithNoAuthDirective', async () => {
    for (const graphqlClient of [graphqlClientWithIAMAccessBasicRole]) {
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
