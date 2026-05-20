import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

type CloudFormationDescribeStacksClient = {
  send: (command: DescribeStacksCommand) => Promise<{ Stacks?: Array<{ StackStatus?: string }> }>;
};

export const formatRollbackCompleteStackMessage = (stackName: string): string =>
  `Cannot deploy stack ${stackName} because it is in ROLLBACK_COMPLETE. ` +
  'CloudFormation cannot update a stack in this state. Delete the failed stack after reviewing any stateful resources, ' +
  'or deploy with a new stack name/environment.';

export const assertStackCanBeUpdated = async (
  stackName: string,
  client: CloudFormationDescribeStacksClient = new CloudFormationClient({ region: process.env.CLI_REGION || 'us-west-2' }),
): Promise<void> => {
  try {
    const response = await client.send(new DescribeStacksCommand({ StackName: stackName }));
    const stackStatus = response.Stacks?.[0]?.StackStatus;
    if (stackStatus === 'ROLLBACK_COMPLETE') {
      throw new Error(formatRollbackCompleteStackMessage(stackName));
    }
  } catch (error: any) {
    if (error?.name === 'ValidationError' && error?.message?.includes('does not exist')) {
      return;
    }
    throw error;
  }
};
