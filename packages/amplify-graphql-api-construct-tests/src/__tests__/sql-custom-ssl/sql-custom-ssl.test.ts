import * as path from 'path';
import * as fs from 'fs-extra';
import { SSMClient, PutParameterCommand, DeleteParameterCommand } from '@aws-sdk/client-ssm';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as generator from 'generate-password';
import { initCDKProject, cdkDestroy, cdkDeploy } from '../../commands';
import { SqlDatabaseDetails, SqlDatatabaseController } from '../../sql-datatabase-controller';
import {
  dbDetailsToModelDataSourceStrategy,
  doAppSyncGraphqlOperation,
  fetchSqlBetaLayerArn,
  TestDefinition,
  writeStackConfig,
  writeTestDefinitions,
} from '../../utils';
import { DURATION_1_HOUR, ONE_MINUTE } from '../../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

const schema = /* GraphQL */ `
  type CustomSelectResult {
    value: Int
  }

  type Query {
    customSelect: [CustomSelectResult] @sql(statement: "SELECT 1 AS value")
  }
`;

describe('Custom SSL certificates', () => {
  const disambiguator = `custom-ssl-${Date.now()}`;
  let projRoot: string;
  let sslCertSsmPath: string;
  let betaSqlLayerVersion: string | undefined;

  const region = process.env.CLI_REGION ?? 'us-west-2';
  const baseProjFolderName = path.basename(__filename, '.test.ts');

  const [dbUsername, dbIdentifier] = generator.generateMultiple(2);
  const dbname = 'default_db';
  let dbDetails: SqlDatabaseDetails;

  // We don't need to create any tables for this test since we're only testing connectivity
  const databaseController = new SqlDatatabaseController([], {
    identifier: dbIdentifier,
    engine: 'mysql',
    dbname,
    username: dbUsername,
    region,
  });

  beforeAll(async () => {
    betaSqlLayerVersion = process.env.USE_BETA_SQL_LAYER ? await fetchSqlBetaLayerArn(region) : undefined;

    dbDetails = await databaseController.setupDatabase();
  });

  afterAll(async () => {
    await databaseController.cleanupDatabase();
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (err) {
      console.log(`Error invoking 'cdk destroy': ${err}`);
    }

    try {
      await deleteSslCertAtPath(sslCertSsmPath, region);
    } catch (err) {
      console.log(`Error deleting SSL cert from SSM at ${sslCertSsmPath}: ${err}`);
    }

    deleteProjectDir(projRoot);
  });

  test('SQL Lambda can connect if using a valid SSL certificate', async () => {
    const prefix = 'custsslvalid';
    const projFolderName = `${baseProjFolderName}-${prefix}`;
    projRoot = await createNewProjectDir(projFolderName);
    const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'configurable-stack'));
    const name = await initCDKProject(projRoot, templatePath);

    // We will use the relevant CA cert from the RDS bundle, and expect the test to succeed. Note that the entire bundle is too large to be
    // stored in an SSM parameter, so we've used only the CA that applies to the region we're running the test in.
    //
    // NOTES:
    // - If the default ever changes, (e.g., if RDS introduces a new CA the default) this test will fail.
    // - The default size of a Standard SSM parameter is 4KB, but the regional bundles exceed that limit because they contain 5 CA certs
    //   (different algorithms; different key sizes), so we store using an advanced parameter tier.
    // - TODO: Once we centralize DB creation into a pool of resources managed by CDK, we'll be able to easily specify which CA to use, and
    //   keep the certs in sync.
    const sslCertFilesystemPath = path.resolve(path.join(__dirname, 'rds-bundles', `${region}-bundle.pem`));
    sslCertSsmPath = `/amplify/integtest/${prefix}/${disambiguator}`;
    const version = await uploadSslCertAtPathToSsm(sslCertFilesystemPath, region, sslCertSsmPath);
    console.log(`Uploaded cert to SSM at ${sslCertSsmPath} (version ${version})`);

    const strategy = dbDetailsToModelDataSourceStrategy(dbDetails, prefix, 'MYSQL', 'secretsManagerManagedSecret');
    // Cast through `any` to allow us to assign to the readonly sslCertSsmPath field
    (strategy as any).dbConnectionConfig.sslCertConfig = {
      ssmPath: sslCertSsmPath,
    };

    const testDefinitions: Record<string, TestDefinition> = {
      [prefix]: {
        schema,
        strategy,
      },
    };

    writeStackConfig(projRoot, { prefix, useSandbox: true });
    writeTestDefinitions(testDefinitions, projRoot);

    // const outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: 2 * ONE_MINUTE });
    const outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: 0 });
    const { awsAppsyncApiEndpoint, awsAppsyncApiKey } = outputs[name];

    const result = await queryCustomSslField(awsAppsyncApiEndpoint, awsAppsyncApiKey);

    expect(result.body.errors).not.toBeDefined();
    expect(result.body.data.customSelect).toBeDefined();
    expect(result.body.data.customSelect[0].value).toEqual(1);
  });

  test('SQL Lambda cannot connect if using an invalid SSL certificate', async () => {
    const prefix = 'custsslinvalid';
    const projFolderName = `${baseProjFolderName}-${prefix}`;
    projRoot = await createNewProjectDir(projFolderName);
    const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'configurable-stack'));
    const name = await initCDKProject(projRoot, templatePath);

    // We will use a self-signed cert as the only SSL cert in the trust chain, and expect a connection failure
    const sslCertFilesystemPath = path.resolve(path.join(__dirname, 'self-signed-ca-cert.pem'));
    sslCertSsmPath = `/amplify/integtest/${prefix}/${disambiguator}`;
    const version = await uploadSslCertAtPathToSsm(sslCertFilesystemPath, region, sslCertSsmPath);
    console.log(`Uploaded cert to SSM at ${sslCertSsmPath} (version ${version})`);

    const strategy = dbDetailsToModelDataSourceStrategy(dbDetails, prefix, 'MYSQL', 'secretsManagerManagedSecret');
    // Cast through `any` to allow us to assign to the readonly sslCertSsmPath field
    (strategy as any).dbConnectionConfig.sslCertConfig = {
      ssmPath: sslCertSsmPath,
    };

    const testDefinitions: Record<string, TestDefinition> = {
      [prefix]: {
        schema,
        strategy,
      },
    };

    writeStackConfig(projRoot, { prefix, useSandbox: true, sqlLambdaLayerArn: betaSqlLayerVersion });
    writeTestDefinitions(testDefinitions, projRoot);

    const outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: 2 * ONE_MINUTE });
    const { awsAppsyncApiEndpoint, awsAppsyncApiKey } = outputs[name];

    const result = await queryCustomSslField(awsAppsyncApiEndpoint, awsAppsyncApiKey);

    expect(result.body.data?.customSelect).toBeNull();
    expect(result.body.errors).toBeDefined();
    expect(result.body.errors[0].message).toEqual('Error processing the request. Check the logs for more details.');
  });
});

/**
 * Stores the SSL cert at the given path filesystem to SSM as a SecretString at the given SSM path, and returns the version
 * @returns The version of the uploaded SSM parameter
 */
const uploadSslCertAtPathToSsm = async (sslCertFilesystemPath: string, region: string, sslCertSsmPath: string): Promise<number> => {
  const sslCertWithLineBreaks = fs.readFileSync(sslCertFilesystemPath).toString();
  const sslCert = sslCertWithLineBreaks.replace(/\n/g, '');
  const ssmClient = new SSMClient({ region: region });
  const command = new PutParameterCommand({
    Name: sslCertSsmPath,
    Value: sslCert,
    Type: 'SecureString',
    Tier: 'Advanced',
  });
  const output = await ssmClient.send(command);
  if (!output.Version) {
    throw new Error('Failed to upload SSL cert to SSM');
  }
  return output.Version;
};

const deleteSslCertAtPath = async (sslCertSsmPath: string, region: string): Promise<void> => {
  const ssmClient = new SSMClient({ region: region });
  const command = new DeleteParameterCommand({
    Name: sslCertSsmPath,
  });
  await ssmClient.send(command);
};

const queryCustomSslField = async (apiEndpoint: string, apiKey: string): Promise<any> => {
  return doAppSyncGraphqlOperation({
    apiEndpoint,
    auth: { apiKey },
    query: /* GraphQL */ `
      query CustomSelect {
        customSelect {
          value
        }
      }
    `,
    variables: {},
  });
};
