import { stateManager } from '@aws-amplify/amplify-cli-core';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { Construct } from 'constructs';
import path from 'path';
import { applyFileBasedOverride } from '../../../graphql-transformer/override';

jest.spyOn(stateManager, 'getLocalEnvInfo').mockReturnValue({ envName: 'testEnvName' });
jest.spyOn(stateManager, 'getProjectConfig').mockReturnValue({ projectName: 'testProjectName' });

describe('ModelTransformer:', () => {
  it('should override  model objects when given override config', () => {
    const validSchema = `
      type Post @model {
        id: ID!
        comments: [Comment]
      }
      type Comment @model{
        id: String!
        text: String!
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      overrideConfig: {
        applyOverride: (scope: Construct) => applyFileBasedOverride(scope, path.join(__dirname, 'model-overrides')),
        overrideFlag: true,
      },
    });
    expect(out).toBeDefined();
    const postStack = out.stacks.Post;
    const commentStack = out.stacks.Comment;

    expect(postStack).toMatchSnapshot();
    expect(commentStack).toMatchSnapshot();
  });

  it('should not override model objects when override file does not exist', () => {
    const validSchema = `
      type Post @model {
        id: ID!
        comments: [Comment]
      }
      type Comment @model{
        id: String!
        text: String!
      }
    `;
    const out = testTransform({
      schema: validSchema,
      transformers: [new ModelTransformer()],
      overrideConfig: {
        applyOverride: (scope: Construct) => applyFileBasedOverride(scope, path.join(__dirname, 'non-existing-override-directory')),
        overrideFlag: true,
      },
    });
    expect(out).toBeDefined();
    const postStack = out.stacks.Post;
    const commentStack = out.stacks.Comment;

    expect(postStack).toMatchSnapshot();
    expect(commentStack).toMatchSnapshot();
  });
});
