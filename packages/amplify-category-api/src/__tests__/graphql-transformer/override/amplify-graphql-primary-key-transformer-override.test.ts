import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform, StackManager, ConflictHandlerType, SyncConfig } from '@aws-amplify/graphql-transformer-core';
import * as path from 'path';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { stateManager } from '@aws-amplify/amplify-cli-core';
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

  const transformer = new GraphQLTransform({
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer()],
    resolverConfig: {
      project: config,
    },
    overrideConfig: {
      applyOverride: (stackManager: StackManager) => {
        return applyFileBasedOverride(stackManager, path.join(__dirname, 'primary-key-overrides'))
      },
      overrideFlag: true,
    },
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  expect(out.stacks.Test.Resources.CreateTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources.GetTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources.ListTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources.DeleteTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources.UpdateTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources.SyncTestResolver).toMatchSnapshot();
  expect(out.stacks.Test.Resources.TestDataSource).toMatchSnapshot();
});
