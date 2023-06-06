import { GraphQLTransform, StackManager } from '@aws-amplify/graphql-transformer-core';
import * as path from 'path';
import { PredictionsTransformer } from '..';
import { stateManager } from '@aws-amplify/amplify-cli-core';
import { applyOverride } from '@aws-amplify/amplify-category-api';

jest.spyOn(stateManager, 'getLocalEnvInfo').mockReturnValue({ envName: 'testEnvName' });
jest.spyOn(stateManager, 'getProjectConfig').mockReturnValue({ projectName: 'testProjectName' });

test('it generates resources with overrides', () => {
  const validSchema = /* GraphQL */ `
    type Query {
      speakTranslatedIdentifiedText: String @predictions(actions: [identifyText, translateText, convertTextToSpeech])
      speakTranslatedLabelText: String @predictions(actions: [identifyLabels, translateText, convertTextToSpeech])
    }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new PredictionsTransformer({ bucketName: 'myStorage${hash}-${env}' })],
    overrideConfig: {
      applyOverride: (stackManager: StackManager) => {
        return applyOverride(stackManager, path.join(__dirname, 'overrides'))
      },
      overrideFlag: true,
    },
  });

  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  expect(out.stacks).toMatchSnapshot();
});

test('it skips override if override file does not exist', () => {
  const validSchema = /* GraphQL */ `
    type Query {
      speakTranslatedIdentifiedText: String @predictions(actions: [identifyText, translateText, convertTextToSpeech])
      speakTranslatedLabelText: String @predictions(actions: [identifyLabels, translateText, convertTextToSpeech])
    }
  `;
  const transformer = new GraphQLTransform({
    transformers: [new PredictionsTransformer({ bucketName: 'myStorage${hash}-${env}' })],
    overrideConfig: {
      applyOverride: (stackManager: StackManager) => {
        return applyOverride(stackManager, path.join(__dirname, 'non-existing-override-directory'))
      },
      overrideFlag: true,
    },
  });

  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  expect(out.stacks).toMatchSnapshot();
});
