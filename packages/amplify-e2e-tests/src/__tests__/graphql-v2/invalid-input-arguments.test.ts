import {
  initJSProjectWithProfile,
  deleteProject,
  amplifyPush,
  addApiWithBlankSchemaAndConflictDetection,
  updateApiSchema,
  getProjectMeta,
  createNewProjectDir,
  deleteProjectDir,
} from 'amplify-category-api-e2e-core';
import { API } from 'aws-amplify';
import { GRAPHQL_AUTH_MODE } from '@aws-amplify/api';

(global as any).fetch = require('node-fetch');

const projectName = 'invalidarguments';
describe('Invalid arguments should throw an error', () => {
  let projRoot: string;

  beforeAll(async () => {
    projRoot = await createNewProjectDir(projectName);
    await initJSProjectWithProfile(projRoot, {
      name: projectName,
    });
    const v2Schema = 'model_with_datatypes.graphql';
    await addApiWithBlankSchemaAndConflictDetection(projRoot, { transformerVersion: 2 });
    await updateApiSchema(projRoot, projectName, v2Schema);
    await amplifyPush(projRoot);
    await configureAmplifyAPI(projRoot);
  });

  afterAll(async () => {
    await deleteProject(projRoot);
    deleteProjectDir(projRoot);
  });

  it('create mutation should error on invalid input arguments', async () => {
    const invalid_create_inputs = [
      { title: 'task 1', description: 'task 1 description', priority: 1, dueDate: 'invalid date' }, // Invalid date argument
      { title: 'test', description: 'task 1 description', priority: 2, dueDate: 1000000 }, // Invalid date argument
      { title: 'task 1', description: 'task 1 description', priority: 5.1, dueDate: '2022-01-01T00:00:00.000Z' }, // Passing float in place of int
      { title: 'task 1', description: 'task 1 description', priority: 'invalid', dueDate: '2022-01-01T00:00:00.000Z' }, // Passing string in place of int
    ];

    await runQueryAndExpectError(createTask, invalid_create_inputs);
  });

  it('list query should error on invalid filter arguments', async () => {
    const invalid_filter_inputs = [
      { priority: { eq: 1.5 } }, // Invalid datatype - passing float for int
      { priority: { eq: 'test' } }, // Invalid datatype - passing string for int
      { priority: { gt: 1.5 } }, // Invalid datatype - passing float for int
      { priority: { lt: 'test' } }, // Invalid datatype - passing string for int
      { and: { priority: { lt: 'test' } } }, // Invalid datatype - passing string for int with 'and' condition
      { priority: { lt: 'test' } }, // Invalid datatype - passing string for int
      { priority: { between: [1] } }, // Incorrect number of arguments for between operator
      { priority: { between: [1, 2.5] } }, // Incorrect argument value for between operator
      { or: [{ priority: { between: [1, 2.5] } }, { title: { gt: 'test' } }] }, // Incorrect argument value for between operator with 'or' condition
    ];

    await runQueryAndExpectError(listTasks, invalid_filter_inputs);
  });

  const createTask = async (createInput: any): Promise<any> => {
    const createMutation = /* GraphQL */ `
      mutation CreateTask($input: CreateTaskInput!, $condition: ModelTaskConditionInput) {
        createTask(input: $input, condition: $condition) {
          id
          title
          description
          priority
          dueDate
          _lastChangedAt
          _version
          _deleted
        }
      }
    `;

    const result: any = await API.graphql({
      query: createMutation,
      variables: {
        input: createInput,
      },
      authMode: GRAPHQL_AUTH_MODE.API_KEY,
    });
    return result;
  };

  const listTasks = async (filter: any): Promise<any> => {
    const listTasksQuery = /* GraphQL */ `
      query ListTasks($filter: ModelTaskFilterInput) {
        listTasks(filter: $filter) {
          items {
            id
            title
            description
            priority
            dueDate
            _lastChangedAt
            _version
            _deleted
          }
        }
      }
    `;

    const result: any = await API.graphql({
      query: listTasksQuery,
      variables: {
        filter,
      },
      authMode: GRAPHQL_AUTH_MODE.API_KEY,
    });
    return result;
  };

  const configureAmplifyAPI = async (projRoot: string) => {
    const meta = getProjectMeta(projRoot);
    const region = meta['providers']['awscloudformation']['Region'] as string;
    const { output } = meta.api[projectName];
    const url = output.GraphQLAPIEndpointOutput as string;
    const apiKey = output.GraphQLAPIKeyOutput as string;

    API.configure({
      aws_appsync_graphqlEndpoint: url,
      aws_appsync_region: region,
      aws_appsync_authenticationType: 'API_KEY',
      aws_appsync_apiKey: apiKey,
    });
  };

  const runQueryAndExpectError = async (query: (input: any) => any, inputs: any[]) => {
    await Promise.all(
      inputs.map(async (input) => {
        try {
          const queryResult = await query(input);
          expect(false).toBeTruthy();
        } catch (error) {
          expect(error.errors).toBeDefined();
          expect(error.errors.length).toBeGreaterThanOrEqual(1);
        }
      }),
    );
  };
});
