import {
  initJSProjectWithProfile,
  deleteProject,
  amplifyPush,
  addApiWithBlankSchema,
  updateApiSchema,
  createNewProjectDir,
  deleteProjectDir,
  apiGqlCompile,
  setStackMapping,
  getProjectMeta,
} from 'amplify-category-api-e2e-core';
import * as path from 'path';
import * as fs from 'fs-extra';
import { assertNotNull } from '@aws-amplify/graphql-transformer-core/lib/cdk-compat/stack-synthesizer';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import gql from 'graphql-tag';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');
// to deal with subscriptions in node env
(global as any).WebSocket = require('ws');

const projectName = 'indexmap';
const mappedResolverStack = 'MappedResolvers';
const providerName = 'awscloudformation';

const getMappedStackPath = (projRoot: string): string =>
  path.join(projRoot, 'amplify', 'backend', 'api', projectName, 'build', 'stacks', `${mappedResolverStack}.json`);

const validateThatSongsCanBeCreatedAndQueriedByIndex = async (projRoot: string): Promise<void> => {
  const meta = getProjectMeta(projRoot);
  const region = meta.providers[providerName].Region as string;
  const { output } = meta.api[projectName];
  const url = output.GraphQLAPIEndpointOutput as string;
  const apiKey = output.GraphQLAPIKeyOutput as string;

  const api = new AWSAppSyncClient({
    url,
    region,
    disableOffline: true,
    auth: { type: AUTH_TYPE.API_KEY, apiKey },
  });

  const fetchPolicy = 'no-cache';
  const name = 'songName';
  const genre = 'songGenre';

  await api.mutate({
    mutation: gql(/* GraphQL */ `
      mutation CreateSong($input: CreateSongInput!) {
        createSong(input: $input) {
          id
        }
      }
    `),
    fetchPolicy,
    variables: { input: { name, genre } },
  });

  const songInfoByGenreResponse = await api.query({
    query: gql(/* GraphQL */ `
      query SongInfoByGenre($genre: String!) {
        songInfoByGenre(genre: $genre) {
          items {
            id
          }
        }
      }
    `),
    fetchPolicy,
    variables: { genre },
  });
  expect((songInfoByGenreResponse as any).data.songInfoByGenre.items.length).toEqual(1);

  await api.mutate({
    mutation: gql(/* GraphQL */ `
      mutation CreateSongWithSortKey($input: CreateSongWithSortKeyInput!) {
        createSongWithSortKey(input: $input) {
          id
        }
      }
    `),
    fetchPolicy,
    variables: { input: { name, genre } },
  });

  const songWithSortKeysByNameAndGenreResponse = await api.query({
    query: gql(/* GraphQL */ `
      query SongWithSortKeysByNameAndGenre($name: String!, $genre: ModelStringKeyConditionInput) {
        songWithSortKeysByNameAndGenre(name: $name, genre: $genre) {
          items {
            id
          }
        }
      }
    `),
    fetchPolicy,
    variables: { name, genre: { eq: genre } },
  });
  expect((songWithSortKeysByNameAndGenreResponse as any).data.songWithSortKeysByNameAndGenre.items.length).toEqual(1);
};

describe('Index Directive with Stack Mapping Tests', () => {
  let projRoot: string;

  beforeEach(async () => {
    projRoot = await createNewProjectDir(projectName);
    await initJSProjectWithProfile(projRoot, {
      name: projectName,
    });

    await addApiWithBlankSchema(projRoot, { transformerVersion: 2 });
    updateApiSchema(projRoot, projectName, 'schema_with_index.graphql');
  });

  afterEach(async () => {
    await deleteProject(projRoot);
    deleteProjectDir(projRoot);
  });

  it('Generates mapped index resolvers in the mapped stack, and can be queried', async () => {
    // Set stack mappings for our index resolvers and compile the backend cloudformation
    setStackMapping(projRoot, projectName, {
      QuerysongInfoByGenreResolver: mappedResolverStack,
      QuerysongWithSortKeysByNameAndGenreResolver: mappedResolverStack,
    });
    await apiGqlCompile(projRoot);

    // Validate resolvers exist in mapped stack definition
    expect(fs.existsSync(getMappedStackPath(projRoot))).toEqual(true);
    const mappedStackDefinition = JSON.parse(fs.readFileSync(getMappedStackPath(projRoot), 'utf8'));

    assertNotNull(mappedStackDefinition.Resources.QuerysongInfoByGenreResolver);
    assertNotNull(mappedStackDefinition.Resources.QuerysongWithSortKeysByNameAndGenreResolver);

    // Push and ensure that we can query against the indexes
    await amplifyPush(projRoot);
    await validateThatSongsCanBeCreatedAndQueriedByIndex(projRoot);
  });

  it('Generates unmapped index resolvers in the mapped stack, and can be queried', async () => {
    // Set empty stack mappings and compile the backend cloudformation
    setStackMapping(projRoot, projectName, {});
    await apiGqlCompile(projRoot);

    // Validate mapped stack definition does not exist
    expect(fs.existsSync(getMappedStackPath(projRoot))).toEqual(false);

    // Push and ensure that we can query against the indexes
    await amplifyPush(projRoot);
    await validateThatSongsCanBeCreatedAndQueriedByIndex(projRoot);
  });
});
