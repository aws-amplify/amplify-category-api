import path from 'path';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { PredictionsTransformer } from '@aws-amplify/graphql-predictions-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { type Output } from '@aws-sdk/client-cloudformation';
import { S3Client as AWSS3Client, CreateBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs-extra';
import { ResourceConstants } from 'graphql-transformer-common';
import { default as moment } from 'moment';
import { CloudFormationClient } from '../CloudFormationClient';
import { cleanupStackAfterTest, deploy } from '../deployNestedStacks';
import { GraphQLClient } from '../GraphQLClient';
import { S3Client } from '../S3Client';
import { resolveTestRegion } from '../testSetup';

const AWS_REGION = resolveTestRegion();

// tslint:disable: no-magic-numbers
jest.setTimeout(2000000);

const cf = new CloudFormationClient(AWS_REGION);
const customS3Client = new S3Client(AWS_REGION);
const awsS3Client = new AWSS3Client({ region: AWS_REGION });
const BUILD_TIMESTAMP = moment().format('YYYYMMDDHHmmss');
const STACK_NAME = `PredictionsTransformerV2Tests-${BUILD_TIMESTAMP}`;
const BUCKET_NAME = `appsync-predictions-transformer-v2-test-bucket-${BUILD_TIMESTAMP}`;
const LOCAL_FS_BUILD_DIR = '/tmp/predictions_transformer_tests_v2/';
const S3_ROOT_DIR_KEY = 'deployments';

let GRAPHQL_CLIENT: GraphQLClient = undefined;

function outputValueSelector(key: string) {
  return (outputs: Output[]) => {
    const output = outputs?.find((o: Output) => o.OutputKey === key);
    return output ? output.OutputValue : null;
  };
}

beforeAll(async () => {
  const validSchema = `
    type Query {
      translateImageText: String @predictions(actions: [ identifyText ])
      translateLabels: String @predictions(actions: [ identifyLabels ])
      translateThis: String @predictions(actions: [ translateText ])
      speakTranslatedText: String @predictions(actions: [ translateText convertTextToSpeech])
    }
  `;
  try {
    await awsS3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
  } catch (e) {
    console.warn(`Could not create bucket: ${e}`);
  }
  const out = testTransform({
    schema: validSchema,
    transformers: [new ModelTransformer(), new PredictionsTransformer({ bucketName: BUCKET_NAME })],
    transformParameters: {
      sandboxModeEnabled: true,
    },
  });
  const finishedStack = await deploy(
    customS3Client,
    cf,
    STACK_NAME,
    out,
    {},
    LOCAL_FS_BUILD_DIR,
    BUCKET_NAME,
    S3_ROOT_DIR_KEY,
    BUILD_TIMESTAMP,
  );
  // Arbitrary wait to make sure everything is ready.
  await cf.wait(5, () => Promise.resolve());
  expect(finishedStack).toBeDefined();
  const getApiEndpoint = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIEndpointOutput);
  const getApiKey = outputValueSelector(ResourceConstants.OUTPUTS.GraphQLAPIApiKeyOutput);
  const endpoint = getApiEndpoint(finishedStack.Outputs);
  const apiKey = getApiKey(finishedStack.Outputs);

  if (!finishedStack.Outputs) {
    throw new Error(`Stack deployment failed. Stack status: ${finishedStack.StackStatus}. No outputs available.`);
  }

  if (!endpoint) {
    throw new Error(
      `GraphQL API endpoint not found in stack outputs. Available outputs: ${JSON.stringify(
        finishedStack.Outputs.map((o) => o.OutputKey),
      )}`,
    );
  }

  if (!apiKey) {
    throw new Error(
      `GraphQL API key not found in stack outputs. Available outputs: ${JSON.stringify(finishedStack.Outputs.map((o) => o.OutputKey))}`,
    );
  }

  expect(apiKey).toBeDefined();
  expect(endpoint).toBeDefined();
  GRAPHQL_CLIENT = new GraphQLClient(endpoint, { 'x-api-key': apiKey });
});

afterAll(async () => {
  await cleanupStackAfterTest(BUCKET_NAME, STACK_NAME, cf);
});

test('translate and convert text to speech', async () => {
  // logic to test graphql
  const response = await GRAPHQL_CLIENT.query(
    `query SpeakTranslatedText($input: SpeakTranslatedTextInput!) {
      speakTranslatedText(input: $input)
    }`,
    {
      input: {
        translateText: {
          sourceLanguage: 'en',
          targetLanguage: 'es',
          text: 'this is a voice test',
        },
        convertTextToSpeech: {
          voiceID: 'Conchita',
        },
      },
    },
  );
  expect(response).toBeDefined();
  const pollyURL = response.data.speakTranslatedText;
  // check that return format is a url
  expect(pollyURL).toMatch(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/);
});

test('translate text individually', async () => {
  const germanTranslation =
    /((\bDies\b)|(\bdas\b)|(\bder\b)) ist ein ((\bStimmtest\b)|(\Sprachtest\b)|(\bStimmetest\b)|(\bStimmentest\b))/i;
  const response = await GRAPHQL_CLIENT.query(
    `query TranslateThis($input: TranslateThisInput!) {
      translateThis(input: $input)
    }`,
    {
      input: {
        translateText: {
          sourceLanguage: 'en',
          targetLanguage: 'de',
          text: 'this is a voice test',
        },
      },
    },
  );
  expect(response).toBeDefined();
  const translatedText = response.data.translateThis;
  expect(translatedText).toMatch(germanTranslation);
});

test('identify image text', async () => {
  const file = path.join(__dirname, 'test-data', 'amazon.png');
  const buffer = fs.readFileSync(file);

  await awsS3Client.send(
    new PutObjectCommand({
      Key: 'public/amazon-logo.png',
      Body: buffer,
      Bucket: BUCKET_NAME,
    }),
  );
  const response = await GRAPHQL_CLIENT.query(
    `query TranslateImageText($input: TranslateImageTextInput!) {
      translateImageText(input: $input)
    }`,
    {
      input: {
        identifyText: {
          key: 'amazon-logo.png',
        },
      },
    },
  );

  expect(response).toBeDefined();
  expect(response.data.translateImageText).toEqual('Available on amazon R');
});

test('identify labels', async () => {
  const file = path.join(__dirname, 'test-data', 'dogs.png');
  const buffer = fs.readFileSync(file);

  await awsS3Client.send(
    new PutObjectCommand({
      Key: 'public/dogs.png',
      Body: buffer,
      Bucket: BUCKET_NAME,
    }),
  );
  const response = await GRAPHQL_CLIENT.query(
    `query TranslateLabels($input: TranslateLabelsInput!) {
      translateLabels(input: $input)
    }`,
    {
      input: {
        identifyLabels: {
          key: 'dogs.png',
        },
      },
    },
  );

  expect(response).toBeDefined();
  expect(response.data.translateLabels).toBeDefined();
  expect(response.data.translateLabels.length > 0).toBeTruthy();
});
