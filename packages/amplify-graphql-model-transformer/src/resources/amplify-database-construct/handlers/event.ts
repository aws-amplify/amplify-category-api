import { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from 'aws-lambda';
import {
  CreateClusterCommand,
  CreateClusterCommandInput,
  CreateClusterCommandOutput,
  DeleteClusterCommand,
  DeleteClusterCommandInput,
  DSQLClient,
  UpdateClusterCommand,
  UpdateClusterCommandInput,
} from '@aws-sdk/client-dsql';

const region = process.env.AWS_REGION ?? 'us-east-1';

const dsqlClient = new DSQLClient({ region });

export interface AmplifyDatabaseProps {
  /**
   * If enabled, you can't delete your cluster. You must first disable this property before you can delete your cluster. Defaults to `false`
   */
  readonly deletionProtectionEnabled?: boolean;

  /**
   * The name of the cluster as reported in the console. This will be propagated to a `Name` tag.
   */
  readonly name: string;

  /**
   * A map of key/value pairs to use to tag your cluster. Maximum 175 items. Amplify will add some tags by default, including a `Name` tag
   * filled with the value of the {@link name} property.
   */
  readonly tags?: Record<string, string>;
}

export const handler = async (event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> => {
  switch (event.RequestType) {
    case 'Create': {
      const response = await createCluster(event.ResourceProperties as unknown as AmplifyDatabaseProps);
      return {
        Status: 'SUCCESS',
        PhysicalResourceId: response.identifier!,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: {
          ...response,
        },
      };
    }
    case 'Update': {
      const response = await updateCluster(event.PhysicalResourceId, event.ResourceProperties as unknown as CreateClusterCommandOutput);
      return {
        Status: 'SUCCESS',
        PhysicalResourceId: response.identifier!,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: {
          ...response,
        },
      };
    }

    case 'Delete': {
      const response = await deleteCluster(event.PhysicalResourceId);
      return {
        Status: 'SUCCESS',
        PhysicalResourceId: response.identifier!,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: {
          ...response,
        },
      };
    }

    default: {
      throw new Error(`Unsupported request type ${(event as any).RequestType}`);
    }
  }
};

const createCluster = async (input: AmplifyDatabaseProps): Promise<CreateClusterCommandOutput> => {
  const resolvedInput: CreateClusterCommandInput = {
    ...input,
    tags: {
      ...input.tags,
      Name: input.name,
    },
  };
  const command = new CreateClusterCommand(resolvedInput);
  const response = await dsqlClient.send(command);
  return response;
};

const updateCluster = async (identifier: string, props: CreateClusterCommandOutput): Promise<CreateClusterCommandOutput> => {
  const { deletionProtectionEnabled } = props;

  const input: UpdateClusterCommandInput = {
    identifier,
    deletionProtectionEnabled,
  };
  const command = new UpdateClusterCommand(input);
  const response = await dsqlClient.send(command);
  return response;
};

const deleteCluster = async (identifier: string): Promise<CreateClusterCommandOutput> => {
  const input: DeleteClusterCommandInput = {
    identifier,
  };
  const command = new DeleteClusterCommand(input);
  const response = await dsqlClient.send(command);
  return response;
};
