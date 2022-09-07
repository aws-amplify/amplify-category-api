import {
    initJSProjectWithProfile,
    deleteProject,
    amplifyPush,
} from 'amplify-category-api-e2e-core';
import { addApiWithBlankSchemaAndConflictDetection, updateApiSchema, getProjectMeta } from 'amplify-category-api-e2e-core';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import gql from 'graphql-tag';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
(global as any).fetch = require('node-fetch');

const projectName = 'invalidarguments';
describe('Invalid arguments should throw an error', () => {
    let projRoot: string;
    let appSyncClient = undefined;

    beforeAll(async () => {
        projRoot = await createNewProjectDir(projectName);
        await initJSProjectWithProfile(projRoot, {
            name: projectName,
        });
        const v2Schema = 'model_with_datatypes.graphql';
        await addApiWithBlankSchemaAndConflictDetection(projRoot, { transformerVersion: 2 });
        await updateApiSchema(projRoot, projectName, v2Schema);
        await amplifyPush(projRoot);

        appSyncClient = getAppSyncClientFromProj(projRoot);
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
        ];
        
        await Promise.all(
            invalid_create_inputs.map(async (input) => {
                console.log(input);
                try {
                    const createResult = await createTask(input);
                    expect(false).toBeTruthy();
                } catch (error) {
                    expect(true).toBeTruthy();
                }
            }),
        );
    });

    it('list query should error on invalid filter arguments', async () => {
        const invalid_filter_inputs = [
            { priority: { eq: 1.5 } }, // Invalid datatype - passing float for int
            { dueDate: { gt: 1000 } }, // Invalid datatype - datetime
            { title: { eq: 1 } }, // Invalid datatype - passing int for string
            { priority: { between: [1] } }, // Incorrect number of arguments for between operator
        ];

        await Promise.all(
            invalid_filter_inputs.map(async (input) => {
                console.log(input);
                try {
                    const listResult = await listTasks(input);
                    expect(false).toBeTruthy();
                } catch (error) {
                    expect(true).toBeTruthy();
                }
            }),
        );
    });

    const getAppSyncClientFromProj = (projRoot: string) => {
        const meta = getProjectMeta(projRoot);
        const region = meta['providers']['awscloudformation']['Region'] as string;
        const { output } = meta.api[projectName];
        const url = output.GraphQLAPIEndpointOutput as string;
        const apiKey = output.GraphQLAPIKeyOutput as string;

        return new AWSAppSyncClient({
            url,
            region,
            disableOffline: true,
            auth: {
                type: AUTH_TYPE.API_KEY,
                apiKey,
            },
        });
    };

    const createTask = async (
        createInput: any
    ): Promise<any> => {
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

        const result: any = await appSyncClient.mutate({
            mutation: gql(createMutation),
            fetchPolicy: 'no-cache',
            variables: {
                input: createInput,
            },
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

        const result: any = await appSyncClient.query({
            query: gql(listTasksQuery),
            fetchPolicy: 'no-cache',
            variables: {
                filter,
            },
        });
        return result;
    };
});
