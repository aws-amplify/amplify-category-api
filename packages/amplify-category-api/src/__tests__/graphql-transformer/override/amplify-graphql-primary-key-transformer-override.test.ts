import { stateManager } from '@aws-amplify/amplify-cli-core';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { ConflictHandlerType, SyncConfig } from '@aws-amplify/graphql-transformer-core';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { Construct } from 'constructs';
import * as path from 'path';
import { applyFileBasedOverride } from '../../../graphql-transformer/override';

jest.spyOn(stateManager, 'getLocalEnvInfo').mockReturnValue({ envName: 'testEnvName' });
jest.spyOn(stateManager, 'getProjectConfig').mockReturnValue({ projectName: 'testProjectName' });

test('it overrides expected resources', () => {
  const validSchema = `
    type Test @model {
      email: String! @primaryKey
    }
  `;
  const config: SyncConfig = {
    ConflictDetection: 'VERSION',
    ConflictHandler: ConflictHandlerType.AUTOMERGE,
  };

  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
    resolverConfig: {
      project: config,
    },
    overrideConfig: {
      applyOverride: (scope: Construct) => applyFileBasedOverride(scope, path.join(__dirname, 'primary-key-overrides')),
      overrideFlag: true,
    },
  });
  expect(out).toBeDefined();
  expect(out.stacks.Test.Resources!.CreateTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources!.GetTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources!.ListTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources!.DeleteTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources!.UpdateTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources!.SyncTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources!.TestDataSource).toMatchSnapshot();
});
