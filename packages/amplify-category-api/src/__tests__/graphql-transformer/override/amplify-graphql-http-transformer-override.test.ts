import { GraphQLTransform, StackManager } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import path from 'path';
import { stateManager } from '@aws-amplify/amplify-cli-core';
import { applyOverride } from '../../../graphql-transformer/override';
import { HttpTransformer } from '@aws-amplify/graphql-http-transformer';

jest.spyOn(stateManager, 'getLocalEnvInfo').mockReturnValue({ envName: 'testEnvName' });
jest.spyOn(stateManager, 'getProjectConfig').mockReturnValue({ projectName: 'testProjectName' });

test('it generates the overrided resources', () => {
  const validSchema = /* GraphQL */ `
    type Comment {
      id: ID!
      content: String @http(method: POST, url: "http://www.api.com/ping")
      content2: String @http(method: PUT, url: "http://www.api.com/ping")
      more: String @http(url: "http://api.com/ping/me/2")
      evenMore: String @http(method: DELETE, url: "http://www.google.com/query/id")
      stillMore: String @http(method: PATCH, url: "https://www.api.com/ping/id")
    }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new HttpTransformer()],
    overrideConfig: {
      applyOverride: (stackManager: StackManager) => {
        return applyOverride(stackManager, path.join(__dirname, 'http-overrides'))
      },
      overrideFlag: true,
    },
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  expect(out.stacks).toBeDefined();
  parse(out.schema);
  const stack = out.stacks.HttpStack;
  expect(stack).toMatchSnapshot();
});

test('it skips override if file does not exist', () => {
  const validSchema = /* GraphQL */ `
    type Comment {
      id: ID!
      content: String @http(method: POST, url: "http://www.api.com/ping")
      content2: String @http(method: PUT, url: "http://www.api.com/ping")
      more: String @http(url: "http://api.com/ping/me/2")
      evenMore: String @http(method: DELETE, url: "http://www.google.com/query/id")
      stillMore: String @http(method: PATCH, url: "https://www.api.com/ping/id")
    }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new HttpTransformer()],
    overrideConfig: {
      applyOverride: (stackManager: StackManager) => {
        return applyOverride(stackManager, path.join(__dirname, 'non-existing-override-dir'))
      },
      overrideFlag: true,
    },
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  expect(out.stacks).toBeDefined();
  parse(out.schema);
  const stack = out.stacks.HttpStack;
  expect(stack).toMatchSnapshot();
});
