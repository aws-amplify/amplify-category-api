import * as path from 'path';
import { createNewProjectDir, deleteProjectDir, initCDKProject, cdkDeploy, cdkDestroy } from 'amplify-category-api-e2e-core';
import { retrieveCodegenAsset } from '../retrieve-codegen-asset';

jest.setTimeout(1000 * 60 * 60 /* 1 hour */);

describe('CDK Model Introspection Schema Provider', () => {
  let projRoot: string;

  beforeEach(async () => {
    projRoot = await createNewProjectDir('modelintro');
  });

  afterEach(async () => {
    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* No-op */
    }

    deleteProjectDir(projRoot);
  });

  test('CDK deploys with the modelIntrospectionSchema URI if a transformer is provided', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'model-introspection'));
    const name = await initCDKProject(projRoot, templatePath);
    const outputs = await cdkDeploy(projRoot, '--all');
    const { amplifyApiModelIntrospectionSchemaS3Uri } = outputs[name];

    expect(amplifyApiModelIntrospectionSchemaS3Uri).toBeDefined();

    const retrievedModelIntrospectionSchema = JSON.parse(await retrieveCodegenAsset(amplifyApiModelIntrospectionSchemaS3Uri));
    expect(retrievedModelIntrospectionSchema).toEqual({
      version: 1,
      models: {
        Todo: {
          name: 'Todo',
          fields: {
            id: {
              name: 'id',
              type: 'ID',
              isArray: false,
              isRequired: false,
            },
            description: {
              name: 'description',
              type: 'String',
              isArray: false,
              isRequired: true,
            },
            createdAt: {
              name: 'createdAt',
              type: 'AWSDateTime',
              isArray: false,
              isRequired: false,
            },
            updatedAt: {
              name: 'updatedAt',
              type: 'AWSDateTime',
              isArray: false,
              isRequired: false,
            },
          },
          pluralName: 'Todos',
          primaryKeyInfo: {
            isCustomPrimaryKey: false,
            primaryKeyFieldName: 'id',
            sortKeyFieldNames: [],
          },
        },
      },
      nonModels: {},
      enums: {},
    });
  });
});
