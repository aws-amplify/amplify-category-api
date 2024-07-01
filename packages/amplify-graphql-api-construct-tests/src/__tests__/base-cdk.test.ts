import * as path from 'path';
import {
  createNewProjectDir,
  deleteProjectDir,
  getBucketNameFromModelSchemaS3Uri,
  getBucketCorsPolicy,
} from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { graphql } from '../graphql-request';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer', () => {
  let projRoot: string;
  let projFolderName: string;

  beforeEach(async () => {
    projFolderName = 'cdktransformer';
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  ['2.129.0', 'latest'].forEach((cdkVersion) => {
    test(`CDK base case - aws-cdk-lib@${cdkVersion}`, async () => {
      const templatePath = path.resolve(path.join(__dirname, 'backends', 'base-cdk'));
      const name = await initCDKProject(projRoot, templatePath, { cdkVersion });
      const outputs = await cdkDeploy(projRoot, '--all');

      // Console requires CORS enabled on codegen asset bucket.
      const { awsAppsyncRegion: region, amplifyApiModelSchemaS3Uri: codegenModelSchemaS3Uri } = outputs[name];
      const codegenBucketName = getBucketNameFromModelSchemaS3Uri(codegenModelSchemaS3Uri);
      const corsPolicy = await getBucketCorsPolicy(codegenBucketName, region);
      expect(corsPolicy).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            AllowedHeaders: expect.arrayContaining(['*']),
            AllowedMethods: expect.arrayContaining(['GET', 'HEAD']),
            AllowedOrigins: expect.arrayContaining([`https://${region}.console.aws.amazon.com/amplify`]),
          }),
        ]),
      );

      const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

      const result = await graphql(
        apiEndpoint,
        apiKey,
        /* GraphQL */ `
          mutation CREATE_TODO {
            createTodo(input: { description: "todo desc" }) {
              id
              description
            }
          }
        `,
      );

      expect(result).toMatchSnapshot({
        body: {
          data: {
            createTodo: {
              id: expect.any(String),
            },
          },
        },
      });

      const todo = result.body.data.createTodo;

      const listResult = await graphql(
        apiEndpoint,
        apiKey,
        /* GraphQL */ `
          query LIST_TODOS {
            listTodos {
              items {
                id
                description
              }
            }
          }
        `,
      );
      expect(listResult).toMatchSnapshot({
        body: {
          data: {
            listTodos: {
              items: [
                {
                  id: expect.any(String),
                },
              ],
            },
          },
        },
      });

      expect(todo.id).toEqual(listResult.body.data.listTodos.items[0].id);
    });
  });
});
