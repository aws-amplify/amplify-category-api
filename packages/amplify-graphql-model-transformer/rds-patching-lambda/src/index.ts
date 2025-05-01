import { LambdaClient, UpdateFunctionConfigurationCommand, UpdateFunctionConfigurationCommandOutput } from '@aws-sdk/client-lambda';

const SNS_EVENT_SOURCE = 'aws:sns';

type LayerConfig = {
  layerArn?: string;
  region?: string;
};

const MIN_WAIT_TIME_IN_MS = 0; // No wait time
const MAX_WAIT_TIME_IN_MS = 5 * 60 * 1000; // 5 minutes

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitRandomTime = (): Promise<void> => {
  const waitTime = Math.floor(Math.random() * (MAX_WAIT_TIME_IN_MS - MIN_WAIT_TIME_IN_MS + 1) + MIN_WAIT_TIME_IN_MS);
  console.log(`Waiting for ${waitTime} ms (B)`);
  return delay(waitTime);
};

const getLayerConfig = (event: any): LayerConfig => {
  // Check layerArn in the event
  const { Sns } = event.Records.find((record: any) => record.EventSource === SNS_EVENT_SOURCE);
  if (!Sns) {
    throw new Error('No SNS notification found in the event');
  }

  const layerArn = Sns?.MessageAttributes?.LayerArn?.Value;
  const region = Sns?.MessageAttributes?.Region?.Value;

  return {
    layerArn,
    region,
  };
};

const updateFunction = async (layerArn: string): Promise<UpdateFunctionConfigurationCommandOutput> => {
  const client = new LambdaClient({ region: process.env.AWS_REGION });
  const lambdaFunctionArn = process.env.LAMBDA_FUNCTION_ARN;
  const command = new UpdateFunctionConfigurationCommand({
    FunctionName: lambdaFunctionArn,
    Layers: [layerArn],
  });
  const response = await client.send(command);
  return response;
};

export const handler = async (event: any): Promise<void> => {
  // Record the received event in logs
  console.log('Received event', JSON.stringify(event, null, 4));

  const { layerArn, region } = getLayerConfig(event);
  if (!layerArn || !region) {
    throw new Error('Layer ARN or region is missing in the notification event');
  }

  if (region !== process.env.AWS_REGION) {
    console.log(`Region ${region} in notification is not same as the current region ${process.env.AWS_REGION}. Skipping update.`);
    return;
  }

  // Wait for a random time up to 5 minutes.
  // This is to avoid all the functions updating at the same time which may result in throttling errors.
  await waitRandomTime();

  // Update the function configuration with the new layer version
  try {
    const response = await updateFunction(layerArn);
    console.log(`Updated layer version to ${layerArn}`, response);
  } catch (e) {
    console.error('Error Updating layer', e);
    throw e;
  }
};
