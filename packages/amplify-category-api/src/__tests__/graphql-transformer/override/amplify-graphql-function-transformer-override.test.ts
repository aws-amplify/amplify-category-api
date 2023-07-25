import * as path from 'path';
import { stateManager } from '@aws-amplify/amplify-cli-core';
import { parse } from 'graphql';
import { FunctionTransformer } from '@aws-amplify/graphql-function-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { Construct } from 'constructs';
import { applyFileBasedOverride } from '../../../graphql-transformer/override';

jest.spyOn(stateManager, 'getLocalEnvInfo').mockReturnValue({ envName: 'testEnvName' });
jest.spyOn(stateManager, 'getProjectConfig').mockReturnValue({ projectName: 'testProjectName' });

test('it ovderrides the expected resources', () => {
  const validSchema = `
    type Query {
      echo(msg: String): String @function(name: "echofunction-\${env}") @function(name: "otherfunction")
    }
      `;

  const out = testTransform({
    schema: validSchema,
    transformers: [new FunctionTransformer()],
    overrideConfig: {
      applyOverride: (scope: Construct) => applyFileBasedOverride(scope, path.join(__dirname, 'function-overrides')),
      overrideFlag: true,
    },
  });
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

  const out = testTransform({
    schema: validSchema,
    transformers: [new FunctionTransformer()],
    overrideConfig: {
      applyOverride: (scope: Construct) => applyFileBasedOverride(scope, path.join(__dirname, 'non-existing-override-directory')),
      overrideFlag: true,
    },
  });
  expect(out).toBeDefined();
  parse(out.schema);
  expect(out.stacks).toBeDefined();
  const stack = out.stacks.FunctionDirectiveStack;
  expect(stack).toBeDefined();
  expect(stack).toMatchSnapshot();
});
