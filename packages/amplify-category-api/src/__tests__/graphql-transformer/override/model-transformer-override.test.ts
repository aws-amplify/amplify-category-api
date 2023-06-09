import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform, StackManager } from '@aws-amplify/graphql-transformer-core';
import path from 'path';
import { stateManager } from '@aws-amplify/amplify-cli-core';
import { applyFileBasedOverride } from '../../../graphql-transformer/override';

jest.spyOn(stateManager, 'getLocalEnvInfo').mockReturnValue({ envName: 'testEnvName' });
jest.spyOn(stateManager, 'getProjectConfig').mockReturnValue({ projectName: 'testProjectName' });

const featureFlags = {
  getBoolean: jest.fn(),
  getNumber: jest.fn(),
  getObject: jest.fn(),
};

describe('ModelTransformer: ', () => {
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
    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
      overrideConfig: {
        applyOverride: (stackManager: StackManager) => applyFileBasedOverride(stackManager, path.join(__dirname, 'model-overrides')),
        overrideFlag: true,
      },
      featureFlags,
    });
    const out = transformer.transform(validSchema);
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
    const transformer = new GraphQLTransform({
      transformers: [new ModelTransformer()],
      overrideConfig: {
        applyOverride: (stackManager: StackManager) =>
          applyFileBasedOverride(stackManager, path.join(__dirname, 'non-existing-override-directory')),
        overrideFlag: true,
      },
      featureFlags,
    });
    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();
    const postStack = out.stacks.Post;
    const commentStack = out.stacks.Comment;

    expect(postStack).toMatchSnapshot();
    expect(commentStack).toMatchSnapshot();
  });
});
