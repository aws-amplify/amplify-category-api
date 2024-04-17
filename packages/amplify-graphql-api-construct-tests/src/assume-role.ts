import { AssumeRoleCommand, Credentials, STSClient } from '@aws-sdk/client-sts';

/**
 * Gets credentials of an IAM role.
 */
export const assumeIamRole = async (roleArn: string): Promise<Credentials> => {
  const sts = new STSClient({});
  const roleCredentials = (
    await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: Date.now().toString(),
        DurationSeconds: 3600,
      }),
    )
  ).Credentials;
  return roleCredentials;
};
