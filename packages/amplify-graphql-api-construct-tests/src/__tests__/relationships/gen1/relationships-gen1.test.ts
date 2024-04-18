import * as path from 'path';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../../../commands';
import { graphql } from '../../../graphql-request';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK GraphQL Transformer - Relationships', () => {
  let projRoot: string;
  let apiEndpoint: string;
  let apiKey: string;

  /**
   * Deploy the CDK App before running our test suite.
   * Persist the Endpoint+ApiKey so we can make queries against it.
   */
  beforeAll(async () => {
    projRoot = await createNewProjectDir('cdkrelationships');
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'relationships'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    apiEndpoint = outputs[name].awsAppsyncApiEndpoint;
    apiKey = outputs[name].awsAppsyncApiKey;
  });

  /**
   * Destroy the Cloudformation Stack, and delete the local project directory.
   */
  afterAll(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  test('hasMany relationship can be created and queried with matching belongsTo', async () => {
    const createBlogResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_TODO {
          createBlog(input: { title: "Sample Blog", description: "A Sample Blog" }) {
            id
          }
        }
      `,
    );

    expect(createBlogResult.statusCode).toEqual(200);
    const blogId = createBlogResult.body.data.createBlog.id;

    expect(blogId).toBeDefined();

    const createPostResponse1 = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_POST_1 {
          createPost(input: { title: "Sample Post 1", blogPostsId: "${blogId}" }) { id }
        }
      `,
    );

    expect(createPostResponse1.statusCode).toEqual(200);

    const createPostResponse2 = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_POST_2 {
          createPost(input: { title: "Sample Post 2", blogPostsId: "${blogId}" }) { id }
        }
      `,
    );

    expect(createPostResponse2.statusCode).toEqual(200);

    const getBlogResult = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query GET_BLOG {
          getBlog(id: "${blogId}") {
            id
            title
            posts {
              items {
                id
                title
                blog {
                  id
                }
              }
            }
          }
        }
      `,
    );

    expect(getBlogResult.statusCode).toEqual(200);

    const retrievedBlog = getBlogResult.body.data.getBlog;

    expect(retrievedBlog).toBeDefined();
    expect(retrievedBlog.id).toEqual(blogId);
    expect(retrievedBlog.posts.items.length).toEqual(2);
    expect(retrievedBlog.posts.items[0].title).toMatch(/Sample Post/);
    expect(retrievedBlog.posts.items[0].blog.id).toMatch(blogId);
  });

  test('hasOne relationship can be created and queried', async () => {
    const authorByline = 'Test Author';

    const createAuthorResponse = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_AUTHOR {
          createAuthor(input: { byLine: "${authorByline}" }) { id }
        }
      `,
    );
    expect(createAuthorResponse.statusCode).toEqual(200);

    const authorId = createAuthorResponse.body.data.createAuthor.id;

    const createPostResponse = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_POST {
          createPost(input: { title: "Post With Author", postAuthorId: "${authorId}" }) { id }
        }
      `,
    );
    expect(createPostResponse.statusCode).toEqual(200);

    const postId = createPostResponse.body.data.createPost.id;

    const getPostResponse = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query GET_POST {
          getPost(id: "${postId}") {
            id
            author {
              id
              byLine
            }
          }
        }
      `,
    );
    expect(getPostResponse.statusCode).toEqual(200);

    const retrievedPost = getPostResponse.body.data.getPost;

    expect(retrievedPost).toBeDefined();
    expect(retrievedPost.id).toEqual(postId);
    expect(retrievedPost.author.id).toEqual(authorId);
    expect(retrievedPost.author.byLine).toEqual(authorByline);
  });

  test('manyToMany relationships can be created and queried', async () => {
    // Create 2 posts
    const createPost1Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_POST_1 {
          createPost(input: { title: "A Post" }) {
            id
          }
        }
      `,
    );
    expect(createPost1Response.statusCode).toEqual(200);
    const post1Id = createPost1Response.body.data.createPost.id;

    const createPost2Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_POST_2 {
          createPost(input: { title: "Another Post" }) {
            id
          }
        }
      `,
    );
    expect(createPost2Response.statusCode).toEqual(200);
    const post2Id = createPost2Response.body.data.createPost.id;

    // Create 3 tags
    const createTag1Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_TAG_1 {
          createTag(input: { name: "A Tag" }) {
            id
          }
        }
      `,
    );
    expect(createTag1Response.statusCode).toEqual(200);
    const tag1Id = createTag1Response.body.data.createTag.id;

    const createTag2Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_TAG_2 {
          createTag(input: { name: "Another Tag" }) {
            id
          }
        }
      `,
    );
    expect(createTag2Response.statusCode).toEqual(200);
    const tag2Id = createTag2Response.body.data.createTag.id;

    const createTag3Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_TAG_3 {
          createTag(input: { name: "A Third Tag" }) {
            id
          }
        }
      `,
    );
    expect(createTag3Response.statusCode).toEqual(200);
    const tag3Id = createTag3Response.body.data.createTag.id;

    // Create Post Tag Join records, post 1 -> tags 1, 2, and post 2 -> tags 2, 3
    const createPost1Tag1Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_POST_TAG {
          createPostTags(input: { postId: "${post1Id}", tagId: "${tag1Id}" }) { id }
        }
      `,
    );
    expect(createPost1Tag1Response.statusCode).toEqual(200);

    const createPost1Tag2Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_POST_TAG {
          createPostTags(input: { postId: "${post1Id}", tagId: "${tag2Id}" }) { id }
        }
      `,
    );
    expect(createPost1Tag2Response.statusCode).toEqual(200);

    const createPost2Tag2Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_POST_TAG {
          createPostTags(input: { postId: "${post2Id}", tagId: "${tag2Id}" }) { id }
        }
      `,
    );
    expect(createPost2Tag2Response.statusCode).toEqual(200);

    const createPost2Tag3Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        mutation CREATE_POST_TAG {
          createPostTags(input: { postId: "${post2Id}", tagId: "${tag3Id}" }) { id }
        }
      `,
    );
    expect(createPost2Tag3Response.statusCode).toEqual(200);

    // Validate that I can query through the join table in both directions.
    const getPost1Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query GET_POST {
          getPost(id: "${post1Id}") {
            id
            tags {
              items {
                tag {
                  id
                }
              }
            }
          }
        }
      `,
    );
    expect(getPost1Response.statusCode).toEqual(200);
    const retrievedPost1 = getPost1Response.body.data.getPost;

    const getPost2Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query GET_POST {
          getPost(id: "${post2Id}") {
            id
            tags {
              items {
                tag {
                  id
                }
              }
            }
          }
        }
      `,
    );
    expect(getPost2Response.statusCode).toEqual(200);
    const retrievedPost2 = getPost2Response.body.data.getPost;

    const getTag1Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query GET_TAG {
          getTag(id: "${tag1Id}") {
            id
            posts {
              items {
                post {
                  id
                }
              }
            }
          }
        }
      `,
    );
    expect(getTag1Response.statusCode).toEqual(200);
    const retrievedTag1 = getTag1Response.body.data.getTag;

    const getTag2Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query GET_TAG {
          getTag(id: "${tag2Id}") {
            id
            posts {
              items {
                post {
                  id
                }
              }
            }
          }
        }
      `,
    );
    expect(getTag2Response.statusCode).toEqual(200);
    const retrievedTag2 = getTag2Response.body.data.getTag;

    const getTag3Response = await graphql(
      apiEndpoint,
      apiKey,
      /* GraphQL */ `
        query GET_TAG {
          getTag(id: "${tag3Id}") {
            id
            posts {
              items {
                post {
                  id
                }
              }
            }
          }
        }
      `,
    );
    expect(getTag3Response.statusCode).toEqual(200);
    const retrievedTag3 = getTag3Response.body.data.getTag;

    // All Records can be retrieved, and ids match up.
    expect(retrievedPost1).toBeDefined();
    expect(retrievedPost1.id).toEqual(post1Id);
    expect(retrievedPost2).toBeDefined();
    expect(retrievedPost2.id).toEqual(post2Id);
    expect(retrievedTag1).toBeDefined();
    expect(retrievedTag1.id).toEqual(tag1Id);
    expect(retrievedTag2).toBeDefined();
    expect(retrievedTag2.id).toEqual(tag2Id);
    expect(retrievedTag3).toBeDefined();
    expect(retrievedTag3.id).toEqual(tag3Id);

    // Queries through join table return the correct count of items
    expect(retrievedPost1.tags.items.length).toEqual(2);
    expect(retrievedPost2.tags.items.length).toEqual(2);
    expect(retrievedTag1.posts.items.length).toEqual(1);
    expect(retrievedTag2.posts.items.length).toEqual(2);
    expect(retrievedTag3.posts.items.length).toEqual(1);
  });
});
