import * as path from 'path';
import {
  createNewProjectDir,
  deleteProjectDir,
  deleteProject,
} from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy, createGen1ProjectForMigration, writeTableMap, deleteDDBTables } from '../../commands';
import { graphql } from '../../graphql-request';
import { DURATION_1_HOUR } from '../../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('References Migration', () => {
  let gen1ProjRoot: string;
  let gen2ProjRoot: string;
  let gen1ProjFolderName: string;
  let gen2ProjFolderName: string;
  let dataSourceMapping: Record<string, string>;

  beforeEach(async () => {
    gen1ProjFolderName = 'referencesgen1';
    gen2ProjFolderName = 'referencesgen2';
    gen1ProjRoot = await createNewProjectDir(gen1ProjFolderName);
    gen2ProjRoot = await createNewProjectDir(gen2ProjFolderName);
  });

  afterEach(async () => {
    try {
      await deleteProject(gen1ProjRoot);
    } catch (_) {
      /* No-op */
    }
    try {
      await cdkDestroy(gen2ProjRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    try {
      // Tables are set to retain when migrating from gen 1 to gen 2
      await deleteDDBTables(Object.values(dataSourceMapping));
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(gen1ProjRoot);
    deleteProjectDir(gen2ProjRoot);
  });

  test('references migration', async () => {
    const {
      GraphQLAPIEndpointOutput: gen1APIEndpoint,
      GraphQLAPIKeyOutput: gen1APIKey,
      DataSourceMappingOutput,
    } = await createGen1ProjectForMigration(gen1ProjFolderName, gen1ProjRoot, 'references.graphql');
    dataSourceMapping = JSON.parse(DataSourceMappingOutput);
    const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'migration', 'references'));
    const name = await initCDKProject(gen2ProjRoot, templatePath);
    writeTableMap(gen2ProjRoot, DataSourceMappingOutput);
    const outputs = await cdkDeploy(gen2ProjRoot, '--all');
    const { awsAppsyncApiEndpoint: gen2APIEndpoint, awsAppsyncApiKey: gen2APIKey } = outputs[name];

    const gen1PrimaryResult = await graphql(
      gen1APIEndpoint,
      gen1APIKey,
      /* GraphQL */ `
        mutation CREATE_PRIMARY {
          createPrimary(input: {}) {
            id
          }
        }
      `,
    );
    expect(gen1PrimaryResult.statusCode).toEqual(200);

    const gen1Primary = gen1PrimaryResult.body.data.createPrimary;

    const gen2PrimaryResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
        mutation CREATE_PRIMARY {
          createPrimary(input: {}) {
            id
          }
        }
      `,
    );
    expect(gen2PrimaryResult.statusCode).toEqual(200);

    const gen2Primary = gen2PrimaryResult.body.data.createPrimary;

    const gen1RelatedOneResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
        mutation CREATE_RELATED_ONE {
          createRelatedOne(input: { primaryId: "${gen1Primary.id}" }) {
            id
          }
        }
      `,
    );
    expect(gen1RelatedOneResult.statusCode).toEqual(200);
    
    const gen1RelatedOne = gen1RelatedOneResult.body.data.createRelatedOne;

    const gen2RelatedOneResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
        mutation CREATE_RELATED_ONE {
          createRelatedOne(input: { primaryId: "${gen2Primary.id}" }) {
            id
          }
        }
      `,
    );
    expect(gen2RelatedOneResult.statusCode).toEqual(200);

    const gen2RelatedOne = gen2RelatedOneResult.body.data.createRelatedOne;

    const gen1RelatedManyResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
        mutation CREATE_RELATED_MANY {
          createRelatedMany(input: { primaryId: "${gen1Primary.id}" }) {
            id
          }
        }
      `,
    );
    expect(gen1RelatedManyResult.statusCode).toEqual(200);
    
    const gen1RelatedMany = gen1RelatedOneResult.body.data.createRelatedOne;

    const gen2RelatedManyResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
        mutation CREATE_RELATED_MANY {
          createRelatedMany(input: { primaryId: "${gen2Primary.id}" }) {
            id
          }
        }
      `,
    );
    expect(gen2RelatedManyResult.statusCode).toEqual(200);

    const gen2RelatedMany = gen2RelatedManyResult.body.data.createRelatedMany;

    const gen1ListResult = await graphql(
      gen1APIEndpoint,
      gen1APIKey,
      /* GraphQL */ `
        query LIST_PRIMARY {
          listPrimaries {
            items {
              id
              relatedMany {
                items {
                  id
                  primaryId
                }
                nextToken
              }
              relatedOne {
                id
                primaryId
                primary {
                  id
                }
              }
            }
            nextToken
          }
        }
      `,
    );

    expect(gen1ListResult.statusCode).toEqual(200);
    expect(gen1ListResult.body.data.listPrimaries.items.length).toEqual(2);
    expect([gen1Primary.id, gen2Primary.id]).toContain(gen1ListResult.body.data.listPrimaries.items[0].id);
    expect([gen1Primary.id, gen2Primary.id]).toContain(gen1ListResult.body.data.listPrimaries.items[1].id);

    const gen2ListResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
      query LIST_PRIMARY {
        listPrimaries {
          items {
            id
            relatedMany {
              items {
                id
                primaryId
              }
              nextToken
            }
            relatedOne {
              id
              primaryId
              primary {
                id
              }
            }
          }
          nextToken
        }
      }
      `,
    );

    expect(gen2ListResult.statusCode).toEqual(200);
    expect(gen1ListResult.body.data.listPrimaries.items.length).toEqual(2);
    expect([gen1Primary.id, gen2Primary.id]).toContain(gen1ListResult.body.data.listPrimaries.items[0].id);
    expect([gen1Primary.id, gen2Primary.id]).toContain(gen1ListResult.body.data.listPrimaries.items[1].id);

    await deleteProject(gen1ProjRoot);

    const listResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
      query LIST_PRIMARY {
        listPrimaries {
          items {
            id
            relatedMany {
              items {
                id
                primaryId
              }
              nextToken
            }
            relatedOne {
              id
              primaryId
              primary {
                id
              }
            }
          }
          nextToken
        }
      }
      `,
    );

    expect(listResult.statusCode).toEqual(200);
    expect(listResult.body.data.listPrimaries.items.length).toEqual(2);
    expect([gen1Primary.id, gen2Primary.id]).toContain(listResult.body.data.listPrimaries.items[0].id);
    expect([gen1Primary.id, gen2Primary.id]).toContain(listResult.body.data.listPrimaries.items[1].id);
  });
});
