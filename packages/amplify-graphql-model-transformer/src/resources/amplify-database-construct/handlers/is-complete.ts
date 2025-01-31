import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { DSQLClient, GetClusterCommand, GetClusterCommandInput } from '@aws-sdk/client-dsql';

const region = process.env.AWS_REGION ?? 'us-east-1';

const dsqlClient = new DSQLClient({ region });

interface IsCompleteHandlerResponse {
  IsComplete: boolean;
}

export const handler = async (event: CloudFormationCustomResourceEvent): Promise<IsCompleteHandlerResponse> => {
  // > The input event to isComplete includes all request fields, combined with
  // > all fields returned from onEvent. If PhysicalResourceId has not been
  // > explicitly returned from onEvent, it's value will be calculated based on
  // > the heuristics described above.
  // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.custom_resources-readme.html#asynchronous-providers-iscomplete
  const physicalResourceId = (event as any).PhysicalResourceId;

  switch (event.RequestType) {
    case 'Create':
    case 'Update': {
      const clusterStatus = await getClusterStatus(physicalResourceId);
      if (clusterStatus === 'FAILED') {
        throw new Error(`${event.RequestType} operation failed`);
      }
      return { IsComplete: clusterStatus === 'ACTIVE' };
    }

    case 'Delete': {
      try {
        // If we catch the status request at just the right time, it might
        // return DELETED status rather than a ResourceNotFound error
        const clusterStatus = await getClusterStatus(physicalResourceId);
        if (clusterStatus === 'FAILED') {
          throw new Error(`${event.RequestType} operation failed`);
        }
        return { IsComplete: clusterStatus === 'DELETED' };
      } catch (err) {
        const error = err as Error;
        if (error && typeof error.name === 'string' && error.name === 'ResourceNotFoundException') {
          return { IsComplete: true };
        }
        throw error;
      }
    }

    default: {
      throw new Error(`Unsupported request type ${(event as any).RequestType}`);
    }
  }
};

const getClusterStatus = async (identifier: string): Promise<string> => {
  const input: GetClusterCommandInput = {
    identifier,
  };
  const command = new GetClusterCommand(input);
  const response = await dsqlClient.send(command);
  return response.status!;
};
