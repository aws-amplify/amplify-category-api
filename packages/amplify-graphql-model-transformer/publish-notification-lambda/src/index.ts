import { LambdaClient, ListLayerVersionsCommand } from '@aws-sdk/client-lambda';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

const MAX_ITEMS = 50;
const { LAYER_NAME, SNS_TOPIC_ARN, SNS_TOPIC_REGION } = process.env;

/*
 * NOTE: The list of supported regions must be kept in sync amongst all of:
 * - packages/amplify-graphql-model-transformer/publish-notification-lambda/src/index.ts
 * - the internal pipeline that actually publishes new layer versions
 */
const SUPPORTED_REGIONS = [
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ca-central-1',
  'eu-central-1',
  'eu-north-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'me-south-1',
  'sa-east-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
];

type LayerConfig = {
  layerArn: string;
  region: string;
};

const getLatestVersion = async (layerName: string, region: string): Promise<LayerConfig> => {
  const client = new LambdaClient({ region });
  const versions = [];
  let nextMarker;
  do {
    const command: ListLayerVersionsCommand = new ListLayerVersionsCommand({
      LayerName: layerName,
      MaxItems: MAX_ITEMS,
      Marker: nextMarker,
    });
    // eslint-disable-next-line no-await-in-loop
    const response = await client.send(command);
    if (response.LayerVersions) {
      versions.push(...response.LayerVersions);
    }
    nextMarker = response?.NextMarker;
  } while (nextMarker);
  const result = versions.sort((a, b) => b.Version! - a.Version!)[0];
  return {
    layerArn: result.LayerVersionArn!,
    region,
  };
};

const getLatestVersions = async (): Promise<LayerConfig[]> => {
  const promises = SUPPORTED_REGIONS.map((region) => getLatestVersion(LAYER_NAME!, region));
  return Promise.all(promises);
};

const publishMessage = async (layerArn: string, region: string): Promise<void> => {
  if (!layerArn || !region) {
    console.log(`Layer ARN or region is missing - skipping notification for layer ${layerArn} in region ${region}`);
    return;
  }
  const client = new SNSClient({ region: SNS_TOPIC_REGION });
  const command = new PublishCommand({
    TopicArn: SNS_TOPIC_ARN,
    Message: 'New Lambda Layer version is available',
    Subject: 'New Lambda Layer version is available',
    MessageAttributes: {
      LayerArn: {
        DataType: 'String',
        StringValue: layerArn,
      },
      Region: {
        DataType: 'String',
        StringValue: region,
      },
    },
  });
  await client.send(command);
};

const publishNotification = async (): Promise<void> => {
  const layers = await getLatestVersions();
  const promises: Promise<void>[] = [];
  layers.forEach((layer) => {
    if (!layer.layerArn || !layer.region) {
      console.log('Layer Arn or region is missing in the notification event', layer);
      return;
    }
    promises.push(publishMessage(layer.layerArn, layer.region));
    console.log(`Published notification for layer ${layer.layerArn} in region ${layer.region}`);
  });
  await Promise.all(promises);
};

export const handler = async (): Promise<void> => {
  await publishNotification();
};
