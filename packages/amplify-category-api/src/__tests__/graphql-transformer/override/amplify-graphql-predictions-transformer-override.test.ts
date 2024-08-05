import { stateManager } from '@aws-amplify/amplify-cli-core';
import { PredictionsTransformer } from '@aws-amplify/graphql-predictions-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { Construct } from 'constructs';
import * as path from 'path';
import { applyFileBasedOverride } from '../../../graphql-transformer/override';

jest.spyOn(stateManager, 'getLocalEnvInfo').mockReturnValue({ envName: 'testEnvName' });
jest.spyOn(stateManager, 'getProjectConfig').mockReturnValue({ projectName: 'testProjectName' });

test('it generates resources with overrides', () => {
  const validSchema = /* GraphQL */ `
    type Query {
      speakTranslatedIdentifiedText: String @predictions(actions: [identifyText, translateText, convertTextToSpeech])
      speakTranslatedLabelText: String @predictions(actions: [identifyLabels, translateText, convertTextToSpeech])
    }
  `;
  const out = testTransform({
    schema: validSchema,
    transformers: [new PredictionsTransformer({ bucketName: 'myStorage${hash}-${env}' })],
    overrideConfig: {
      applyOverride: (scope: Construct) => applyFileBasedOverride(scope, path.join(__dirname, 'predictions-overrides')),
      overrideFlag: true,
    },
  });

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
  const out = testTransform({
    schema: validSchema,
    transformers: [new PredictionsTransformer({ bucketName: 'myStorage${hash}-${env}' })],
    overrideConfig: {
      applyOverride: (scope: Construct) => applyFileBasedOverride(scope, path.join(__dirname, 'non-existing-override-directory')),
      overrideFlag: true,
    },
  });

  expect(out).toBeDefined();
  expect(out.stacks).toMatchSnapshot();
});
