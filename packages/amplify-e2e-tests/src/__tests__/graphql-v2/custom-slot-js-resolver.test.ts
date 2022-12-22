import {
  initJSProjectWithProfile,
  deleteProject,
  amplifyPush,
  addApiWithBlankSchema,
  updateApiSchema,
  createNewProjectDir,
  deleteProjectDir,
  getProjectMeta,
} from 'amplify-category-api-e2e-core';
import * as path from 'path';
import * as fs from 'fs-extra';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import gql from 'graphql-tag';

// to deal with bug in cognito-identity-js
(global as any).fetch = require('node-fetch');
// to deal with subscriptions in node env
(global as any).WebSocket = require('ws');

const projectName = 'jsslotoverride';
const providerName = 'awscloudformation';

const writeOverrideResolver = (projRoot: string, resolverName: string, contents: string) => fs.writeFileSync(
  path.join(projRoot, 'amplify', 'backend', 'api', projectName, 'resolvers', resolverName),
  contents,
);

const createAndRetrieveEmptyTodoContent = async (projRoot: string): Promise<void> => {
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

  const createdTodoResponse = await api.mutate({
    mutation: gql(/* GraphQL */ `
      mutation CreateTodo($input: CreateTodoInput!) {
        createTodo(input: $input) { id }
      }
    `),
    fetchPolicy,
    variables: { input: {} },
  });

  const createdTodoId = (createdTodoResponse as any).data.createTodo.id;

  const retrievedTodoContentResponse = await api.query({
    query: gql(/* GraphQL */ `
      query GetTodo($id: ID!) {
        getTodo(id: $id) {
          content
        }
      }
    `),
    fetchPolicy,
    variables: { id: createdTodoId },
  });

  return (retrievedTodoContentResponse as any).data.getTodo.content;
};

describe('JS Resolver Overrides for Slots', () => {
  let projRoot: string;

  beforeEach(async () => {
    projRoot = await createNewProjectDir(projectName);
    await initJSProjectWithProfile(projRoot, {
      name: projectName,
    });

    await addApiWithBlankSchema(projRoot, { transformerVersion: 2 });
    updateApiSchema(projRoot, projectName, 'model_with_sandbox_mode.graphql');
  });

  afterEach(async () => {
    await deleteProject(projRoot);
    deleteProjectDir(projRoot);
  });

  it('Allows adding custom resolvers into an unused slot', async () => {
    const overrideContentMessage = 'I was set by an overridden resolver';
    writeOverrideResolver(projRoot, 'Query.getTodo.postDataLoad.0.js', `
      export function request() {
        return {};
      }

      export function response(ctx) {
        const data = ctx.prev.result;
        data.content = '${overrideContentMessage}';
        return data;
      }
    `);

    await amplifyPush(projRoot);
    const retrievedTodoContent = await createAndRetrieveEmptyTodoContent(projRoot);

    expect(retrievedTodoContent).toEqual(overrideContentMessage)
  });

  it('Allows overriding generated VTL resolvers with a JS resolver', async () => {
    writeOverrideResolver(projRoot, 'Query.getTodo.postAuth.1.js', `
      import { util } from '@aws-appsync/utils'

      export function request() {
        util.unauthorized();
        return {};
      }

      export function response(ctx) {
        {}
      }
    `);

    await amplifyPush(projRoot);
    await expect(async () => await createAndRetrieveEmptyTodoContent(projRoot)).rejects.toThrow('Not Authorized to access getTodo on type Todo');
  });
});
