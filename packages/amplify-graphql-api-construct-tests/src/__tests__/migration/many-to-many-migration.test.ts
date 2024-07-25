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
    gen1ProjFolderName = 'mtmmigrationgen1';
    gen2ProjFolderName = 'mtmmigrationgen2';
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
      // await cdkDestroy(gen2ProjRoot, '--all');
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
    // deleteProjectDir(gen2ProjRoot);
  });

  test('many-to-many migration', async () => {
    const {
      GraphQLAPIEndpointOutput: gen1APIEndpoint,
      GraphQLAPIKeyOutput: gen1APIKey,
      DataSourceMappingOutput,
    } = await createGen1ProjectForMigration(gen1ProjFolderName, gen1ProjRoot, 'many-to-many.graphql');
    dataSourceMapping = JSON.parse(DataSourceMappingOutput);
    const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'migration', 'many-to-many'));
    const name = await initCDKProject(gen2ProjRoot, templatePath);
    writeTableMap(gen2ProjRoot, DataSourceMappingOutput);
    const outputs = await cdkDeploy(gen2ProjRoot, '--all');
    const { awsAppsyncApiEndpoint: gen2APIEndpoint, awsAppsyncApiKey: gen2APIKey } = outputs[name];

    const gen1PostResult = await graphql(
      gen1APIEndpoint,
      gen1APIKey,
      /* GraphQL */ `
        mutation CREATE_POST {
          createPost(input: {title: "my post"}) {
            id
            title
          }
        }
      `,
    );
    expect(gen1PostResult.statusCode).toEqual(200);

    const gen1Post = gen1PostResult.body.data.createPost;

    const gen1TagResult = await graphql(
      gen1APIEndpoint,
      gen1APIKey,
      /* GraphQL */ `
        mutation CREATE_TAG {
          createTag(input: {label: "my tag"}) {
            id
            label
          }
        }
      `,
    );
    expect(gen1TagResult.statusCode).toEqual(200);

    const gen1Tag = gen1TagResult.body.data.createTag;

    const gen1PostTagsResult = await graphql(
      gen1APIEndpoint,
      gen1APIKey,
      /* GraphQL */ `
        mutation CREATE_TAG {
          createPostTags(input: {tagId: "${gen1Tag.id}", postId: "${gen1Post.id}"}) {
            id
            postId
            tagId
          }
        }
      `,
    );
    expect(gen1PostTagsResult.statusCode).toEqual(200);

    const gen1PostTags = gen1PostTagsResult.body.data.createPostTags;

    const gen2PostResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
        mutation CREATE_POST {
          createPost(input: {title: "my post"}) {
            id
            title
          }
        }
      `,
    );
    expect(gen2PostResult.statusCode).toEqual(200);

    const gen2Post = gen2PostResult.body.data.createPost;

    const gen2TagResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
        mutation CREATE_TAG {
          createTag(input: {label: "my tag"}) {
            id
            label
          }
        }
      `,
    );
    expect(gen2TagResult.statusCode).toEqual(200);

    const gen2Tag = gen2TagResult.body.data.createTag;

    const gen2PostTagsResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
        mutation CREATE_POST_TAG {
          createPostTags(input: {tagId: "${gen2Tag.id}", postId: "${gen2Post.id}"}) {
            id
            postId
            tagId
          }
        }
      `,
    );
    expect(gen2PostTagsResult.statusCode).toEqual(200);

    const gen1ListResult = await graphql(
      gen1APIEndpoint,
      gen1APIKey,
      /* GraphQL */ `
        query LIST_POSTS {
          listPosts {
            items {
              id
              tags {
                items {
                  id
                }
              }
            }
          }
        }
      `,
    );

    expect(gen1ListResult.statusCode).toEqual(200);
    expect(gen1ListResult.body.data.listPosts.items.length).toEqual(2);
    expect([gen1Post.id, gen2Post.id]).toContain(gen1ListResult.body.data.listPosts.items[0].id);
    expect([gen1Post.id, gen2Post.id]).toContain(gen1ListResult.body.data.listPosts.items[1].id);
    expect(gen1ListResult.body.data.listPosts.items[0].tags.items.length).toEqual(1);
    expect(gen1ListResult.body.data.listPosts.items[1].tags.items.length).toEqual(1);

    const gen2ListResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
        query LIST_POSTS {
          listPosts {
            items {
              id
              tags {
                items {
                  id
                }
              }
            }
          }
        }
      `,
    );

    expect(gen2ListResult.statusCode).toEqual(200);
    expect(gen2ListResult.body.data.listPosts.items.length).toEqual(2);
    expect([gen1Post.id, gen2Post.id]).toContain(gen2ListResult.body.data.listPosts.items[0].id);
    expect([gen1Post.id, gen2Post.id]).toContain(gen2ListResult.body.data.listPosts.items[1].id);
    expect(gen2ListResult.body.data.listPosts.items[0].tags.items.length).toEqual(1);
    expect(gen2ListResult.body.data.listPosts.items[1].tags.items.length).toEqual(1);

    await deleteProject(gen1ProjRoot);

    const listResult = await graphql(
      gen2APIEndpoint,
      gen2APIKey,
      /* GraphQL */ `
        query LIST_POSTS {
          listPosts {
            items {
              id
              tags {
                items {
                  id
                }
              }
            }
          }
        }
      `,
    );

    expect(listResult.statusCode).toEqual(200);
    expect(listResult.body.data.listPosts.items.length).toEqual(2);
    expect([gen1Post.id, gen2Post.id]).toContain(listResult.body.data.listPosts.items[0].id);
    expect([gen1Post.id, gen2Post.id]).toContain(listResult.body.data.listPosts.items[1].id);
    expect(listResult.body.data.listPosts.items[0].tags.items.length).toEqual(1);
    expect(listResult.body.data.listPosts.items[1].tags.items.length).toEqual(1);
  });
});
