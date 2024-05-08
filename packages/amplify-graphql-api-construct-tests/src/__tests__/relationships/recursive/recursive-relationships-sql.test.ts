import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as generator from 'generate-password';
import { initCDKProject, cdkDestroy } from '../../../commands';
import { dbDetailsToModelDataSourceStrategy, TestDefinition, writeStackConfig, writeTestDefinitions } from '../../../utils';
import { SqlDatabaseDetails, SqlDatatabaseController } from '../../../sql-datatabase-controller';
import { DURATION_1_HOUR } from '../../../utils/duration-constants';
import {
  deployStack,
  testCanNavigateBetweenLeafNodes,
  testCanNavigateToLeafFromRoot,
  testCanNavigateToRootFromLeaf,
} from './test-implementations';

jest.setTimeout(DURATION_1_HOUR);

describe('Models with multiple relationships', () => {
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const baseProjFolderName = path.basename(__filename, '.test.ts');

  const [dbUsername, dbIdentifier] = generator.generateMultiple(2);
  const dbname = 'default_db';
  let dbDetails: SqlDatabaseDetails;

  // Note that the SQL database is created with slightly non-standard naming conventions, to avoid us having to use `refersTo` in the schema
  // snippets. That allows us to reuse the same snippets across both DDB and SQL data sources, simplifying the test fixture data.
  const databaseController = new SqlDatatabaseController(
    [
      'drop table if exists `TreeNode`;',
      'create table `TreeNode` ( id varchar(64) primary key not null, value varchar(64), `parentId` varchar(64));',
      'create index `TreeNode_parentId` on `TreeNode`(`parentId`);',
    ],
    {
      identifier: dbIdentifier,
      engine: 'mysql',
      dbname,
      username: dbUsername,
      region,
    },
  );

  beforeAll(async () => {
    // dbDetails = await databaseController.setupDatabase();
    dbDetails = {
      dbConfig: {
        dbName: 'default_db',
        dbType: 'MYSQL',
        endpoint: 'fhnnvcizbr.cxudc8crpgqw.us-west-2.rds.amazonaws.com',
        port: 3306,
        strategyName: 'mysqlDBStrategy',
        vpcConfig: {
          vpcId: 'vpc-0a8a4272',
          securityGroupIds: ['sg-17a20862'],
          subnetAvailabilityZones: [
            {
              subnetId: 'subnet-75a3f90c',
              availabilityZone: 'us-west-2a',
            },
            {
              subnetId: 'subnet-c54f088e',
              availabilityZone: 'us-west-2b',
            },
            {
              subnetId: 'subnet-5471450e',
              availabilityZone: 'us-west-2c',
            },
            {
              subnetId: 'subnet-5f739274',
              availabilityZone: 'us-west-2d',
            },
          ],
        },
      },
      connectionConfigs: {
        secretsManagerManagedSecret: {
          databaseName: 'default_db',
          hostname: 'fhnnvcizbr.cxudc8crpgqw.us-west-2.rds.amazonaws.com',
          port: 3306,
          secretArn: 'arn:aws:secretsmanager:us-west-2:779656175277:secret:rds!db-0721fd57-c76d-4539-a56a-c49f68f69cf7-o86kf0',
        },
      },
    };
  });

  // afterAll(async () => {
  //   await databaseController.cleanupDatabase();
  // });

  describe('SQL primary, SQL related', () => {
    const projFolderName = `${baseProjFolderName}-sql`;
    let apiEndpoint: string;
    let apiKey: string;
    let currentId: number;
    let projRoot: string;

    beforeEach(() => {
      currentId = Date.now();
    });

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      const templatePath = path.resolve(path.join(__dirname, '..', '..', 'backends', 'configurable-stack'));
      const name = await initCDKProject(projRoot, templatePath);

      const schemaPath = path.resolve(path.join(__dirname, '..', '..', 'graphql-schemas', 'recursive', 'schema.graphql'));
      const schema = fs.readFileSync(schemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'sql-only': {
          schema,
          strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlonly', 'MYSQL', 'secretsManagerManagedSecret'),
        },
      };

      writeStackConfig(projRoot, { prefix: 'RecursiveSql', useSandbox: true });
      writeTestDefinitions(testDefinitions, projRoot);

      const testConfig = await deployStack({
        projRoot,
        name,
      });

      apiEndpoint = testConfig.apiEndpoint;
      apiKey = testConfig.apiKey;
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    test('can navigate to leaf from root', async () => {
      await testCanNavigateToLeafFromRoot(currentId, apiEndpoint, apiKey);
    });

    test('can navigate to root from leaf', async () => {
      await testCanNavigateToRootFromLeaf(currentId, apiEndpoint, apiKey);
    });

    test('can navigate between leaf nodes', async () => {
      await testCanNavigateBetweenLeafNodes(currentId, apiEndpoint, apiKey);
    });
  });
});
