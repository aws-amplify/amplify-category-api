import { SqlEngine } from 'amplify-category-api-e2e-core';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

export type PreProvisionedClusterInfo = {
  clusterArn: string;
  secretArn: string;
  clusterIdentifier: string;
};

export const getPreProvisionedClusterInfo = async (region: string, engine: SqlEngine): Promise<PreProvisionedClusterInfo | undefined> => {
  const s3Client = new S3Client({ region: 'us-east-1' });
  const stsClient = new STSClient({ region });

  try {
    const callerIdentity = await stsClient.send(new GetCallerIdentityCommand({}));
    const accountId = callerIdentity?.Account;
    if (!accountId) {
      throw new Error('Cannot get the current account Id');
    }
    const clusterManifestPrefix = process.env.RDS_CLUSTER_MANIFEST_BUCKET_PREFIX;
    if (!clusterManifestPrefix) {
      throw new Error('Cannot get the cluster manifest prefix');
    }
    const command = new GetObjectCommand({
      Bucket: `${clusterManifestPrefix}${accountId}`,
      Key: `${engine}/${region}`,
    });

    const response = await s3Client.send(command);
    const clusterInfo: PreProvisionedClusterInfo = JSON.parse(await response.Body.transformToString());
    console.log(JSON.stringify(clusterInfo));
    return clusterInfo;
  } catch (err) {
    console.error(err);
    return;
  }
};
