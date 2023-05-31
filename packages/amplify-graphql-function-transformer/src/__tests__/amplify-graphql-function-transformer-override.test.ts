import { GraphQLTransform, StackManager } from '@aws-amplify/graphql-transformer-core';
import { stateManager } from '@aws-amplify/amplify-cli-core';
import { applyOverride } from '@aws-amplify/amplify-category-api';
import { parse } from 'graphql';
import * as path from 'path';
import { FunctionTransformer } from '..';

jest.spyOn(stateManager, 'getLocalEnvInfo').mockReturnValue({ envName: 'testEnvName' });
jest.spyOn(stateManager, 'getProjectConfig').mockReturnValue({ projectName: 'testProjectName' });

test('it ovderrides the expected resources', () => {
  const validSchema = `
    type Query {
      echo(msg: String): String @function(name: "echofunction-\${env}") @function(name: "otherfunction")
    }
      `;

  const transformer = new GraphQLTransform({
    transformers: [new FunctionTransformer()],
    overrideConfig: {
      applyOverride: (stackManager: StackManager) => {
        return applyOverride(stackManager, path.join(__dirname, 'overrides'))
      },
      overrideFlag: true,
    },
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  parse(out.schema);
  expect(out.stacks).toBeDefined();
  const stack = out.stacks.FunctionDirectiveStack;
  expect(stack).toBeDefined();
  expect(stack).toMatchSnapshot();
});

test('it skips override if override file does not exist', () => {
  const validSchema = `
    type Query {
      echo(msg: String): String @function(name: "echofunction-\${env}") @function(name: "otherfunction")
    }
      `;

  const transformer = new GraphQLTransform({
    transformers: [new FunctionTransformer()],
    overrideConfig: {
      applyOverride: (stackManager: StackManager) => (
        applyOverride(stackManager, path.join(__dirname, 'non-existing-override-directory'))
      ),
      overrideFlag: true,
    },
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  parse(out.schema);
  expect(out.stacks).toBeDefined();
  const stack = out.stacks.FunctionDirectiveStack;
  expect(stack).toBeDefined();
  expect(stack).toMatchSnapshot();
});
