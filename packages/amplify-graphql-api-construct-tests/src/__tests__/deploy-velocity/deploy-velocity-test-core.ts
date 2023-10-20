import * as path from 'path';
import * as fs from 'fs';
import { createNewProjectDir, deleteProjectDir, initCDKProject, cdkDeploy, cdkDestroy } from 'amplify-category-api-e2e-core';
import { graphql } from '../../graphql-request';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

export type TestManagedTableDeploymentProps = {
  name: string;
  initialSchema: string;
  updatedSchema: string;
  testDurationLimitMs: number;
};

export const testManagedTableDeployment = ({
  name,
  initialSchema,
  updatedSchema,
  testDurationLimitMs,
}: TestManagedTableDeploymentProps): void => {
  describe(name, () => {
    let projRoot: string;
    let projFolderName: string;

    beforeEach(async () => {
      projFolderName = 'managedtable';
      projRoot = await createNewProjectDir(projFolderName);
    });

    afterEach(async () => {
      deleteProjectDir(projRoot);
    });

    test('CDK Multi GSI', async () => {
      const templatePath = path.resolve(path.join(__dirname, '..', 'backends', 'managed-table-testbench'));
      const stackName = await initCDKProject(projRoot, templatePath);
      const schemaFilePath = path.join(projRoot, 'bin', 'schema.graphql');

      fs.writeFileSync(schemaFilePath, initialSchema);
      const outputs = await cdkDeploy(projRoot, '--all');
      const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[stackName];

      const createResult = await graphql(
        apiEndpoint,
        apiKey,
        /* GraphQL */ `
          mutation CREATE_TODO {
            createTodo(input: { field1: "field1Value", field2: "field2Value" }) {
              id
            }
          }
        `,
      );
      expect(createResult.statusCode).toEqual(200);
      const todoId = createResult.body.data.createTodo.id;

      const getTodoQuery = /* GraphQL */ `
        query GET_TODO {
          getTodo(id: "${todoId}") {
            id
          }
        }
      `;

      const getTodoResult = await graphql(apiEndpoint, apiKey, getTodoQuery);
      expect(getTodoResult.statusCode).toEqual(200);

      const retrievedTodo = getTodoResult.body.data.getTodo;
      expect(retrievedTodo).toBeDefined();
      expect(retrievedTodo.id).toEqual(todoId);

      fs.writeFileSync(schemaFilePath, updatedSchema);
      const deployStartTimestamp = Date.now();
      await cdkDeploy(projRoot, '--all');
      const deployDurationMs = Date.now() - deployStartTimestamp;

      // Verify Data Correctness
      const getTodoPostUpdateResult = await graphql(apiEndpoint, apiKey, getTodoQuery);
      expect(getTodoPostUpdateResult.statusCode).toEqual(200);

      const retrievedTodoPostUpdate = getTodoPostUpdateResult.body.data.getTodo;
      expect(retrievedTodoPostUpdate).toBeDefined();
      expect(retrievedTodoPostUpdate.id).toEqual(todoId);

      // Verify Deploy Speed
      console.log(`Iterative Deploy Duration was ${deployDurationMs}ms`);
      expect(deployDurationMs).toBeLessThanOrEqual(testDurationLimitMs);

      // Cleanup after test complete
      await cdkDestroy(projRoot, '--all');
    });
  });
};
