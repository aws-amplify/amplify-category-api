import * as path from 'path';
import * as fs from 'fs-extra';

import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import * as generator from 'generate-password';
import { DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY } from '@aws-amplify/graphql-transformer-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../../../commands';
import {
  addCognitoUserToGroup,
  createCognitoUser,
  dbDetailsToModelDataSourceStrategy,
  signInCognitoUser,
  TestDefinition,
  writeStackPrefix,
  writeTestDefinitions,
} from '../../../utils';
import { SqlDatabaseDetails, SqlDatatabaseController } from '../../../sql-datatabase-controller';
import { testCreatePrimaryDoesNotRedactRelatedForSameOwningGroup, testCreatePrimaryRedactsRelatedForDifferentOwningGroup, testCreateRelatedManyDoesNotRedactPrimaryForSameOwningGroup, testCreateRelatedManyRedactsPrimaryForDifferentOwningGroup, testCreateRelatedOneDoesNotRedactPrimaryForSameOwningGroup, testCreateRelatedOneRedactsPrimaryForDifferentOwningGroup, testGetPrimaryDoesNotRedactRelatedForSameOwningGroup, testGetPrimaryRedactsRelatedForDifferentOwningGroup, testGetPrimaryUnauthorizedForDifferentOwner, testGetRelatedManyDoesNotRedactPrimaryForSameOwningGroup, testGetRelatedManyRedactsPrimaryForDifferentOwningGroup, testGetRelatedOneDoesNotRedactPrimaryForSameOwningGroup, testGetRelatedOneRedactsPrimaryForDifferentOwningGroup, testListPrimariesDoesNotRedactRelatedForSameOwningGroup, testListPrimariesRedactsTopLevelItemsForDifferentOwningGroup, testListRelatedManiesDoesNotRedactPrimaryForSameOwningGroup, testListRelatedManiesRedactsPrimaryForDifferentOwningGroup, testListRelatedOnesDoesNotRedactPrimaryForSameOwningGroup, testListRelatedOnesRedactsPrimaryForDifferentOwningGroup, testOwningGroupCanGrantOtherGroupsPermissions, testUpdatePrimaryDoesNotRedactRelatedForSameOwningGroup, testUpdatePrimaryRedactsRelatedForDifferentOwningGroup, testUpdateRelatedManyDoesNotRedactPrimaryForSameOwningGroup, testUpdateRelatedManyRedactsPrimaryForDifferentOwningGroup, testUpdateRelatedOneDoesNotRedactPrimaryForSameOwningGroup, testUpdateRelatedOneRedactsPrimaryForDifferentOwningGroup } from './test-implementations';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

// Each of these tests asserts that restricted fields in associated types are properly redacted. To assert this, we create the relationship
// records in an order so that the type we're asserting on comes LAST. By "prepopulating" the associated records before creating the source
// record, we ensure that the selection set is fully populated with relationship data, and can therefore assert that restricted fields on
// the associated records are redacted.
//
// For these tests, "Group1" owns Primary, "Group2" owns Related, and "Group3" is an Admin who owns both
describe('Relationships protected with dynamic group auth', () => {
  const region = process.env.CLI_REGION ?? 'us-west-2';
  const baseProjFolderName = path.basename(__filename, '.test.ts');

  const [dbUsername, dbIdentifier] = generator.generateMultiple(2);
  const dbname = 'default_db';
  let dbDetails: SqlDatabaseDetails;

  // Note that the SQL database is created with slightly non-standard naming conventions, to avoid us having to use `refersTo` in the schema
  // snippets. That allows us to reuse the same snippets across both DDB and SQL data sources, simplifying the test fixture data. Note that
  // this schema uses a json field to hold the groups array. If you migrate this test to Postgres, this must be updated to be a string array
  // instead.
  const databaseController = new SqlDatatabaseController(
    [
      'drop table if exists `RelatedMany`;',
      'drop table if exists `RelatedOne`;',
      'drop table if exists `Primary`;',

      'create table `Primary` ( id varchar(64) primary key not null, content varchar(64), `groups` json);',

      'create table `RelatedMany`( id varchar(64) primary key not null, content varchar(64), `primaryId` varchar(64), `groups` json);',
      'create index `RelatedMany_primaryId` on `RelatedMany`(`primaryId`);',

      'create table `RelatedOne`( id varchar(64) primary key not null, content varchar(64), `primaryId` varchar(64), `groups` json);',
      'create index `RelatedOne_primaryId` on `RelatedOne`(`primaryId`);',
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

  describe('DDB primary, DDB related', () => {
    const projFolderName = `${baseProjFolderName}-ddb-primary-ddb-related`;
    let apiEndpoint: string;
    let currentId: number;
    let group1AccessToken: string;
    let group2AccessToken: string;
    let projRoot: string;

    beforeEach(() => {
      currentId = Date.now();
    });

    beforeAll(async () => {
      projRoot =
        '/private/var/folders/7v/zw_3gb7n2fq2w10b1lyzrhzr0000gr/T/amplify-e2e-tests/dynamic-group-auth-ddb-primary-ddb-related_6e66a279e_9a59fc45';
      const name = JSON.parse(fs.readFileSync(path.join(projRoot, 'package.json'), 'utf8')).name.replace(/_/g, '-');
      // projRoot = await createNewProjectDir(projFolderName);
      // const templatePath = path.resolve(path.join(__dirname, '..', '..', 'backends', 'configurable-stack'));
      // const name = await initCDKProject(projRoot, templatePath);

      const primarySchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-dynamic-group-auth', 'schema-primary.graphql'),
      );
      const primarySchema = fs.readFileSync(primarySchemaPath).toString();

      const relatedSchemaPath = path.resolve(
        path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-dynamic-group-auth', 'schema-related.graphql'),
      );
      const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

      const testDefinitions: Record<string, TestDefinition> = {
        'ddb-prim-ddb-related': {
          schema: primarySchema + '\n' + relatedSchema,
          strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
        },
      };

      writeStackPrefix('StaticGrpDdbDdb', projRoot);
      writeTestDefinitions(testDefinitions, projRoot);

      const testConfig = await deployStackAndCreateUsers({
        projRoot,
        region,
        name,
      });

      group1AccessToken = testConfig.group1AccessToken;
      group2AccessToken = testConfig.group2AccessToken;
      apiEndpoint = testConfig.apiEndpoint;
    });

    // afterAll(async () => {
    //   try {
    //     await cdkDestroy(projRoot, '--all');
    //   } catch (err) {
    //     console.log(`Error invoking 'cdk destroy': ${err}`);
    //   }

    //   deleteProjectDir(projRoot);
    // });

    describe('Primary as source model', () => {
      test('createPrimary shows related models if created by same owning group', async () => {
        await testCreatePrimaryDoesNotRedactRelatedForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('createPrimary redacts related models if created by different owning group', async () => {
        await testCreatePrimaryRedactsRelatedForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('updatePrimary shows related models if created by same owning group', async () => {
        await testUpdatePrimaryDoesNotRedactRelatedForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('updatePrimary redacts related models if created by different owning group', async () => {
        await testUpdatePrimaryRedactsRelatedForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('getPrimary shows related models if created by same owning group', async () => {
        await testGetPrimaryDoesNotRedactRelatedForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('getPrimary redacts related models if created by different owning group', async () => {
        await testGetPrimaryRedactsRelatedForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('listPrimaries shows related models if created by same owning group', async () => {
        await testListPrimariesDoesNotRedactRelatedForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('listPrimaries redacts related models if created by different owning group', async () => {
        await testGetPrimaryRedactsRelatedForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      // We will only test the following cases for the Primary model, since there is no interesting difference between
      // the use cases for GetRelated* or ListRelated*, or for assigning ownership permissions
      test('getPrimary unauthorized top-level item if created by different owning group', async () => {
        await testGetPrimaryUnauthorizedForDifferentOwner(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('listPrimaries redacts top-level items if created by different owning group', async () => {
        await testListPrimariesRedactsTopLevelItemsForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('owning group can grant other groups permissions', async () => {
        await testOwningGroupCanGrantOtherGroupsPermissions(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });
    });

    describe('RelatedOne as source model', () => {
      test('createRelatedOne does not redact primary models if created by same owning group', async () => {
        await testCreateRelatedOneDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('createRelatedOne redacts primary models if created by different owning group', async () => {
        await testCreateRelatedOneRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('updateRelatedOne does not redact primary models if created by same owning group', async () => {
        await testUpdateRelatedOneDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('updateRelatedOne redacts primary models if created by different owning group', async () => {
        await testUpdateRelatedOneRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('getRelatedOne does not redact primary models if created by same owning group', async () => {
        await testGetRelatedOneDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('getRelatedOne redacts primary models if created by different owning group', async () => {
        await testGetRelatedOneRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('listRelatedOnes does not redact primary models if created by same owning group', async () => {
        await testListRelatedOnesDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('listRelatedOnes redacts primary models if created by different owning group', async () => {
        await testListRelatedOnesRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });
    });

    describe('RelatedMany as source model', () => {
      test('createRelatedMany shows related models if created by same owning group', async () => {
        await testCreateRelatedManyDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('createRelatedMany redacts related models if created by different owning group', async () => {
        await testCreateRelatedManyRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('updateRelatedMany shows related models if created by same owning group', async () => {
        await testUpdateRelatedManyDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('updateRelatedMany redacts related models if created by different owning group', async () => {
        await testUpdateRelatedManyRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('getRelatedMany shows related models if created by same owning group', async () => {
        await testGetRelatedManyDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('getRelatedMany redacts related models if created by different owning group', async () => {
        await testGetRelatedManyRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });

      test('listRelatedManies shows related models if created by same owning group', async () => {
        await testListRelatedManiesDoesNotRedactPrimaryForSameOwningGroup(currentId, apiEndpoint, group1AccessToken);
      });

      test('listRelatedManies redacts related models if created by different owning group', async () => {
        await testListRelatedManiesRedactsPrimaryForDifferentOwningGroup(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
      });
    });
  });

  // describe('SQL primary, SQL related', () => {
  //   const projFolderName = `${baseProjFolderName}-sql-primary-sql-related`;
  //   let adminAccessToken: string;
  //   let apiEndpoint: string;
  //   let currentId: number;
  //   let group1AccessToken: string;
  //   let group2AccessToken: string;
  //   let projRoot: string;

  //   beforeEach(() => {
  //     currentId = Date.now();
  //   });

  //   beforeAll(async () => {
  //     projRoot = await createNewProjectDir(projFolderName);
  //     const templatePath = path.resolve(path.join(__dirname, '..', '..', 'backends', 'configurable-stack'));
  //     const name = await initCDKProject(projRoot, templatePath);

  //     const primarySchemaPath = path.resolve(
  //       path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-dynamic-group-auth', 'schema-primary.graphql'),
  //     );
  //     const primarySchema = fs.readFileSync(primarySchemaPath).toString();

  //     const relatedSchemaPath = path.resolve(
  //       path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-dynamic-group-auth', 'schema-related.graphql'),
  //     );
  //     const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

  //     const testDefinitions: Record<string, TestDefinition> = {
  //       'sql-only': {
  //         schema: primarySchema + '\n' + relatedSchema,
  //         strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlonly', 'MYSQL', 'secretsManagerManagedSecret'),
  //       },
  //     };

  //     writeStackPrefix('StaticGrpSqlSql', projRoot);
  //     writeTestDefinitions(testDefinitions, projRoot);

  //     const testConfig = await deployStackAndCreateUsers({
  //       projRoot,
  //       region,
  //       name,
  //     });

  //     group1AccessToken = testConfig.group1AccessToken;
  //     group2AccessToken = testConfig.group2AccessToken;
  //     adminAccessToken = testConfig.adminAccessToken;
  //     apiEndpoint = testConfig.apiEndpoint;
  //   });

  //   afterAll(async () => {
  //     try {
  //       await cdkDestroy(projRoot, '--all');
  //     } catch (err) {
  //       console.log(`Error invoking 'cdk destroy': ${err}`);
  //     }

  //     deleteProjectDir(projRoot);
  //   });

  //   describe('Actors belonging to Group1', () => {
  //     describe('Primary as source model', () => {
  //       test('createPrimary redacts related models', async () => {
  //         await testCreatePrimaryRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2group1AccessToken);
  //       });

  //       test('updatePrimary redacts related models', async () => {
  //         await testUpdatePrimaryRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2group1AccessToken);
  //       });

  //       test('getPrimary redacts related models', async () => {
  //         await testGetPrimaryRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2group1AccessToken);
  //       });

  //       test('listPrimary redacts related models', async () => {
  //         await testListPrimariesRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2group1AccessToken);
  //       });
  //     });

  //     describe('RelatedOne as source model', () => {
  //       test('createRelatedOne is forbidden', async () => {
  //         await testCreateRelatedOneIsForbidden(currentId, apiEndpoint, group1group1AccessToken);
  //       });
  //     });

  //     describe('RelatedMany as source model', () => {
  //       test('createRelatedMany is forbidden', async () => {
  //         await testCreateRelatedManyIsForbidden(currentId, apiEndpoint, group1group1AccessToken);
  //       });
  //     });
  //   });

  //   describe('Actors belonging to Group2', () => {
  //     describe('Primary as source model', () => {
  //       test('createPrimary is forbidden', async () => {
  //         await testCreatePrimaryIsForbidden(currentId, apiEndpoint, group2group1AccessToken);
  //       });
  //     });

  //     describe('RelatedOne as source model', () => {
  //       test('createRelatedOne redacts primary model', async () => {
  //         await testCreateRelatedOneRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2group1AccessToken);
  //       });

  //       test('updateRelatedOne redacts primary model', async () => {
  //         await testUpdateRelatedOneRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2group1AccessToken);
  //       });

  //       test('getRelatedOne redacts primary model', async () => {
  //         await testGetRelatedOneRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2group1AccessToken);
  //       });

  //       test('listRelatedOne redacts primary model', async () => {
  //         await testListRelatedOnesRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2group1AccessToken);
  //       });
  //     });

  //     describe('RelatedMany as source model', () => {
  //       test('createRelatedMany redacts primary model', async () => {
  //         await testCreateRelatedManyRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2group1AccessToken);
  //       });

  //       test('updateRelatedMany redacts primary model', async () => {
  //         await testUpdateRelatedManyRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2group1AccessToken);
  //       });

  //       test('getRelatedMany redacts primary model', async () => {
  //         await testGetRelatedManyRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('listRelatedMany redacts primary model', async () => {
  //         await testListRelatedManiesRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });
  //     });
  //   });

  //   describe('Actors belonging to Admin group', () => {
  //     describe('Primary as source model', () => {
  //       test('createPrimary does not redact related models', async () => {
  //         await testCreatePrimaryDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('updatePrimary does not redact related models', async () => {
  //         await testUpdatePrimaryDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('getPrimary does not redact related models', async () => {
  //         await testGetPrimaryDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('listPrimary does not redact related models', async () => {
  //         await testListPrimariesDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });
  //     });

  //     describe('RelatedOne as source model', () => {
  //       test('createRelatedOne does not redact primary model', async () => {
  //         await testCreateRelatedOneDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('updateRelatedOne does not redact primary model', async () => {
  //         await testUpdateRelatedOneDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('getRelatedOne does not redact primary model', async () => {
  //         await testGetRelatedOneDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('listRelatedOne does not redact primary model', async () => {
  //         await testListRelatedOnesDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });
  //     });

  //     describe('RelatedMany as source model', () => {
  //       test('createRelatedMany does not redact primary model', async () => {
  //         await testCreateRelatedManyDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('updateRelatedMany does not redact primary model', async () => {
  //         await testUpdateRelatedManyDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('getRelatedMany does not redact primary model', async () => {
  //         await testGetRelatedManyDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('listRelatedMany does not redact primary model', async () => {
  //         await testListRelatedManiesDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });
  //     });
  //   });
  // });

  // describe('SQL primary, DDB related', () => {
  //   const projFolderName = `${baseProjFolderName}-sql-primary-ddb-related`;
  //   let adminAccessToken: string;
  //   let apiEndpoint: string;
  //   let currentId: number;
  //   let group1AccessToken: string;
  //   let group2AccessToken: string;
  //   let projRoot: string;

  //   beforeEach(() => {
  //     currentId = Date.now();
  //   });

  //   beforeAll(async () => {
  //     projRoot = await createNewProjectDir(projFolderName);
  //     const templatePath = path.resolve(path.join(__dirname, '..', '..', 'backends', 'configurable-stack'));
  //     const name = await initCDKProject(projRoot, templatePath);

  //     const primarySchemaPath = path.resolve(
  //       path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-dynamic-group-auth', 'schema-primary.graphql'),
  //     );
  //     const primarySchema = fs.readFileSync(primarySchemaPath).toString();

  //     const relatedSchemaPath = path.resolve(
  //       path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-dynamic-group-auth', 'schema-related.graphql'),
  //     );
  //     const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

  //     const testDefinitions: Record<string, TestDefinition> = {
  //       'sql-primary': {
  //         schema: primarySchema,
  //         strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlprimary', 'MYSQL', 'secretsManagerManagedSecret'),
  //       },
  //       'ddb-related': {
  //         schema: relatedSchema,
  //         strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  //       },
  //     };

  //     writeStackPrefix('StaticGrpSqlDdb', projRoot);
  //     writeTestDefinitions(testDefinitions, projRoot);

  //     const testConfig = await deployStackAndCreateUsers({
  //       projRoot,
  //       region,
  //       name,
  //     });

  //     group1AccessToken = testConfig.group1AccessToken;
  //     group2AccessToken = testConfig.group2AccessToken;
  //     adminAccessToken = testConfig.adminAccessToken;
  //     apiEndpoint = testConfig.apiEndpoint;
  //   });

  //   afterAll(async () => {
  //     try {
  //       await cdkDestroy(projRoot, '--all');
  //     } catch (err) {
  //       console.log(`Error invoking 'cdk destroy': ${err}`);
  //     }

  //     deleteProjectDir(projRoot);
  //   });

  //   describe('Actors belonging to Group1', () => {
  //     describe('Primary as source model', () => {
  //       test('createPrimary redacts related models', async () => {
  //         await testCreatePrimaryRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('updatePrimary redacts related models', async () => {
  //         await testUpdatePrimaryRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('getPrimary redacts related models', async () => {
  //         await testGetPrimaryRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('listPrimary redacts related models', async () => {
  //         await testListPrimariesRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });
  //     });

  //     describe('RelatedOne as source model', () => {
  //       test('createRelatedOne is forbidden', async () => {
  //         await testCreateRelatedOneIsForbidden(currentId, apiEndpoint, group1AccessToken);
  //       });
  //     });

  //     describe('RelatedMany as source model', () => {
  //       test('createRelatedMany is forbidden', async () => {
  //         await testCreateRelatedManyIsForbidden(currentId, apiEndpoint, group1AccessToken);
  //       });
  //     });
  //   });

  //   describe('Actors belonging to Group2', () => {
  //     describe('Primary as source model', () => {
  //       test('createPrimary is forbidden', async () => {
  //         await testCreatePrimaryIsForbidden(currentId, apiEndpoint, group2AccessToken);
  //       });
  //     });

  //     describe('RelatedOne as source model', () => {
  //       test('createRelatedOne redacts primary model', async () => {
  //         await testCreateRelatedOneRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('updateRelatedOne redacts primary model', async () => {
  //         await testUpdateRelatedOneRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('getRelatedOne redacts primary model', async () => {
  //         await testGetRelatedOneRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('listRelatedOne redacts primary model', async () => {
  //         await testListRelatedOnesRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });
  //     });

  //     describe('RelatedMany as source model', () => {
  //       test('createRelatedMany redacts primary model', async () => {
  //         await testCreateRelatedManyRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('updateRelatedMany redacts primary model', async () => {
  //         await testUpdateRelatedManyRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('getRelatedMany redacts primary model', async () => {
  //         await testGetRelatedManyRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('listRelatedMany redacts primary model', async () => {
  //         await testListRelatedManiesRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });
  //     });
  //   });

  //   describe('Actors belonging to Admin group', () => {
  //     describe('Primary as source model', () => {
  //       test('createPrimary does not redact related models', async () => {
  //         await testCreatePrimaryDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('updatePrimary does not redact related models', async () => {
  //         await testUpdatePrimaryDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('getPrimary does not redact related models', async () => {
  //         await testGetPrimaryDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('listPrimary does not redact related models', async () => {
  //         await testListPrimariesDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });
  //     });

  //     describe('RelatedOne as source model', () => {
  //       test('createRelatedOne does not redact primary model', async () => {
  //         await testCreateRelatedOneDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('updateRelatedOne does not redact primary model', async () => {
  //         await testUpdateRelatedOneDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('getRelatedOne does not redact primary model', async () => {
  //         await testGetRelatedOneDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('listRelatedOne does not redact primary model', async () => {
  //         await testListRelatedOnesDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });
  //     });

  //     describe('RelatedMany as source model', () => {
  //       test('createRelatedMany does not redact primary model', async () => {
  //         await testCreateRelatedManyDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('updateRelatedMany does not redact primary model', async () => {
  //         await testUpdateRelatedManyDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('getRelatedMany does not redact primary model', async () => {
  //         await testGetRelatedManyDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('listRelatedMany does not redact primary model', async () => {
  //         await testListRelatedManiesDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });
  //     });
  //   });
  // });

  // describe('DDB primary, SQL related', () => {
  //   const projFolderName = `${baseProjFolderName}-ddb-primary-sql-related`;
  //   let adminAccessToken: string;
  //   let apiEndpoint: string;
  //   let currentId: number;
  //   let group1AccessToken: string;
  //   let group2AccessToken: string;
  //   let projRoot: string;

  //   beforeEach(() => {
  //     currentId = Date.now();
  //   });

  //   beforeAll(async () => {
  //     projRoot = await createNewProjectDir(projFolderName);
  //     const templatePath = path.resolve(path.join(__dirname, '..', '..', 'backends', 'configurable-stack'));
  //     const name = await initCDKProject(projRoot, templatePath);

  //     const primarySchemaPath = path.resolve(
  //       path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-dynamic-group-auth', 'schema-primary.graphql'),
  //     );

  //     const primarySchema = fs.readFileSync(primarySchemaPath).toString();

  //     const relatedSchemaPath = path.resolve(
  //       path.join(__dirname, '..', '..', 'graphql-schemas', 'reference-style-dynamic-group-auth', 'schema-related.graphql'),
  //     );
  //     const relatedSchema = fs.readFileSync(relatedSchemaPath).toString();

  //     const testDefinitions: Record<string, TestDefinition> = {
  //       'ddb-primary': {
  //         schema: primarySchema,
  //         strategy: DDB_AMPLIFY_MANAGED_DATASOURCE_STRATEGY,
  //       },
  //       'sql-related': {
  //         schema: relatedSchema,
  //         strategy: dbDetailsToModelDataSourceStrategy(dbDetails, 'sqlrelated', 'MYSQL', 'secretsManagerManagedSecret'),
  //       },
  //     };

  //     writeStackPrefix('StaticGrpDdbSql', projRoot);
  //     writeTestDefinitions(testDefinitions, projRoot);

  //     const testConfig = await deployStackAndCreateUsers({
  //       projRoot,
  //       region,
  //       name,
  //     });

  //     group1AccessToken = testConfig.group1AccessToken;
  //     group2AccessToken = testConfig.group2AccessToken;
  //     adminAccessToken = testConfig.adminAccessToken;
  //     apiEndpoint = testConfig.apiEndpoint;
  //   });

  //   afterAll(async () => {
  //     try {
  //       await cdkDestroy(projRoot, '--all');
  //     } catch (err) {
  //       console.log(`Error invoking 'cdk destroy': ${err}`);
  //     }

  //     deleteProjectDir(projRoot);
  //   });

  //   describe('Actors belonging to Group1', () => {
  //     describe('Primary as source model', () => {
  //       test('createPrimary redacts related models', async () => {
  //         await testCreatePrimaryRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('updatePrimary redacts related models', async () => {
  //         await testUpdatePrimaryRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('getPrimary redacts related models', async () => {
  //         await testGetPrimaryRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('listPrimary redacts related models', async () => {
  //         await testListPrimariesRedactsRelated(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });
  //     });

  //     describe('RelatedOne as source model', () => {
  //       test('createRelatedOne is forbidden', async () => {
  //         await testCreateRelatedOneIsForbidden(currentId, apiEndpoint, group1AccessToken);
  //       });
  //     });

  //     describe('RelatedMany as source model', () => {
  //       test('createRelatedMany is forbidden', async () => {
  //         await testCreateRelatedManyIsForbidden(currentId, apiEndpoint, group1AccessToken);
  //       });
  //     });
  //   });

  //   describe('Actors belonging to Group2', () => {
  //     describe('Primary as source model', () => {
  //       test('createPrimary is forbidden', async () => {
  //         await testCreatePrimaryIsForbidden(currentId, apiEndpoint, group2AccessToken);
  //       });
  //     });

  //     describe('RelatedOne as source model', () => {
  //       test('createRelatedOne redacts primary model', async () => {
  //         await testCreateRelatedOneRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('updateRelatedOne redacts primary model', async () => {
  //         await testUpdateRelatedOneRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('getRelatedOne redacts primary model', async () => {
  //         await testGetRelatedOneRedactsPrimary(currentId, apiEndpoint, group1group1AccessToken, group2AccessToken);
  //       });

  //       test('listRelatedOne redacts primary model', async () => {
  //         await testListRelatedOnesRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
  //       });
  //     });

  //     describe('RelatedMany as source model', () => {
  //       test('createRelatedMany redacts primary model', async () => {
  //         await testCreateRelatedManyRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
  //       });

  //       test('updateRelatedMany redacts primary model', async () => {
  //         await testUpdateRelatedManyRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
  //       });

  //       test('getRelatedMany redacts primary model', async () => {
  //         await testGetRelatedManyRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
  //       });

  //       test('listRelatedMany redacts primary model', async () => {
  //         await testListRelatedManiesRedactsPrimary(currentId, apiEndpoint, group1AccessToken, group2AccessToken);
  //       });
  //     });
  //   });

  //   describe('Actors belonging to Admin group', () => {
  //     describe('Primary as source model', () => {
  //       test('createPrimary does not redact related models', async () => {
  //         await testCreatePrimaryDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('updatePrimary does not redact related models', async () => {
  //         await testUpdatePrimaryDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('getPrimary does not redact related models', async () => {
  //         await testGetPrimaryDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('listPrimary does not redact related models', async () => {
  //         await testListPrimariesDoesNotRedactRelated(currentId, apiEndpoint, adminAccessToken);
  //       });
  //     });

  //     describe('RelatedOne as source model', () => {
  //       test('createRelatedOne does not redact primary model', async () => {
  //         await testCreateRelatedOneDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('updateRelatedOne does not redact primary model', async () => {
  //         await testUpdateRelatedOneDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('getRelatedOne does not redact primary model', async () => {
  //         await testGetRelatedOneDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('listRelatedOne does not redact primary model', async () => {
  //         await testListRelatedOnesDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });
  //     });

  //     describe('RelatedMany as source model', () => {
  //       test('createRelatedMany does not redact primary model', async () => {
  //         await testCreateRelatedManyDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('updateRelatedMany does not redact primary model', async () => {
  //         await testUpdateRelatedManyDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('getRelatedMany does not redact primary model', async () => {
  //         await testGetRelatedManyDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });

  //       test('listRelatedMany does not redact primary model', async () => {
  //         await testListRelatedManiesDoesNotRedactPrimary(currentId, apiEndpoint, adminAccessToken);
  //       });
  //     });
  //   });
  // });
});

interface CommonSetupInput {
  projRoot: string;
  region: string;
  name: string;
}

interface CommonSetupOutput {
  apiEndpoint: string;
  group1AccessToken: string;
  group2AccessToken: string;
}

const deployStackAndCreateUsers = async (input: CommonSetupInput): Promise<CommonSetupOutput> => {
  const { projRoot, region, name } = input;
  const outputs = await cdkDeploy(projRoot, '--all');
  const { awsAppsyncApiEndpoint, UserPoolClientId: userPoolClientId, UserPoolId: userPoolId } = outputs[name];

  const apiEndpoint = awsAppsyncApiEndpoint;

  const group1AccessToken = await createTestUser({
    groupName: 'Group1',
    region,
    userPoolId,
    userPoolClientId,
  });

  const group2AccessToken = await createTestUser({
    groupName: 'Group2',
    region,
    userPoolId,
    userPoolClientId,
  });

  const output: CommonSetupOutput = {
    apiEndpoint,
    group1AccessToken,
    group2AccessToken,
  };

  return output;
};

interface CreateUserAndAssignToGroupInput {
  region: string;
  userPoolId: string;
  userPoolClientId: string;
  groupName: string;
}

/** Creates a test user and assigns to the specified group */
const createTestUser = async (input: CreateUserAndAssignToGroupInput): Promise<string> => {
  const { region, userPoolId, userPoolClientId, groupName } = input;
  const { username, password } = await createCognitoUser({
    region,
    userPoolId,
  });

  await addCognitoUserToGroup({
    region,
    userPoolId,
    username,
    group: groupName,
  });

  const { accessToken } = await signInCognitoUser({
    username,
    password,
    region,
    userPoolClientId,
  });

  return accessToken;
};
