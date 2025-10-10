import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, DeleteBucketCommand, waitUntilBucketNotExists } from '@aws-sdk/client-s3';
import { resolveTestRegion } from './testSetup';

const region = resolveTestRegion();
const awsS3Client = new S3Client({ region: region });

const emptyBucket = async (bucket: string) => {
  let listObjects = await awsS3Client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
    }),
  );
  while (true) {
    try {
      const objectIds = listObjects.Contents.map((content) => ({
        Key: content.Key,
      }));
      const response = await awsS3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objectIds,
          },
        }),
      );
    } catch (e) {
      console.error(`Error deleting objects: ${e}`);
    }
    if (listObjects.NextContinuationToken) {
      listObjects = await awsS3Client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ContinuationToken: listObjects.NextContinuationToken,
        }),
      );
    } else {
      break;
    }
  }
  try {
    await awsS3Client.send(
      new DeleteBucketCommand({
        Bucket: bucket,
      }),
    );
    await waitUntilBucketNotExists({ client: awsS3Client, maxWaitTime: 300 }, { Bucket: bucket });
  } catch (e) {
    console.error(`Error deleting bucket: ${e}`);
  }
};
export default emptyBucket;
