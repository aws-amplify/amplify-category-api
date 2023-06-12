import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform, StackManager, ConflictHandlerType, SyncConfig } from '@aws-amplify/graphql-transformer-core';
import * as path from 'path';
import { IndexTransformer } from '@aws-amplify/graphql-index-transformer';
import { stateManager } from '@aws-amplify/amplify-cli-core';
import { applyFileBasedOverride } from '../../../graphql-transformer/override';

jest.spyOn(stateManager, 'getLocalEnvInfo').mockReturnValue({ envName: 'testEnvName' });
jest.spyOn(stateManager, 'getProjectConfig').mockReturnValue({ projectName: 'testProjectName' });

test('it overrides expected resources', () => {
  const validSchema = `
    type Song @model {
      id: ID!
      name: String!
      genre: String! @index(name : "byGenre", queryField: "songInfoByGenre")
    }
 `;
  const config: SyncConfig = {
    ConflictDetection: 'VERSION',
    ConflictHandler: ConflictHandlerType.AUTOMERGE,
  };

  const transformer = new GraphQLTransform({
    transformers: [new ModelTransformer(), new IndexTransformer()],
    resolverConfig: {
      project: config,
    },
    overrideConfig: {
      applyOverride: (stackManager: StackManager) => {
        return applyFileBasedOverride(stackManager, path.join(__dirname, 'index-overrides'))
      },
      overrideFlag: true,
    },
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  expect(out.stacks.Song.Resources.CreateSongResolver).toMatchSnapshot();
  expect(out.stacks.Song.Resources.GetSongResolver).toMatchSnapshot();
  expect(out.stacks.Song.Resources.ListSongResolver).toMatchSnapshot();
  expect(out.stacks.Song.Resources.DeleteSongResolver).toMatchSnapshot();
  expect(out.stacks.Song.Resources.UpdateSongResolver).toMatchSnapshot();
  expect(out.stacks.Song.Resources.SyncSongResolver).toMatchSnapshot();
  expect(out.stacks.Song.Resources.SongDataSource).toMatchSnapshot();
});
