import { S3 } from 'aws-sdk';
import _ from 'lodash';

export const deleteS3Bucket = async (bucket: string, providedS3Client: S3 | undefined = undefined): Promise<void> => {
  const s3 = providedS3Client ? providedS3Client : new S3();
  let continuationToken: Required<Pick<S3.ListObjectVersionsOutput, 'KeyMarker' | 'VersionIdMarker'>> = undefined;
  const objectKeyAndVersion = <S3.ObjectIdentifier[]>[];
  let truncated = false;
  do {
    const results = await s3
      .listObjectVersions({
        Bucket: bucket,
        ...continuationToken,
      })
      .promise();

    results.Versions?.forEach(({ Key, VersionId }) => {
      objectKeyAndVersion.push({ Key, VersionId });
    });

    results.DeleteMarkers?.forEach(({ Key, VersionId }) => {
      objectKeyAndVersion.push({ Key, VersionId });
    });

    continuationToken = { KeyMarker: results.NextKeyMarker, VersionIdMarker: results.NextVersionIdMarker };
    truncated = results.IsTruncated;
  } while (truncated);
  const chunkedResult = _.chunk(objectKeyAndVersion, 1000);
  const deleteReq = chunkedResult
    .map((r) => {
      return {
        Bucket: bucket,
        Delete: {
          Objects: r,
          Quiet: true,
        },
      };
    })
    .map((delParams) => s3.deleteObjects(delParams).promise());
  await Promise.all(deleteReq);
  await s3
    .deleteBucket({
      Bucket: bucket,
    })
    .promise();
  await bucketNotExists(bucket);
};

const bucketNotExists = async (bucket: string): Promise<boolean> => {
  const s3 = new S3();
  const params = {
    Bucket: bucket,
    $waiter: { maxAttempts: 10, delay: 30 },
  };
  try {
    await s3.waitFor('bucketNotExists', params).promise();
    return true;
  } catch (error) {
    if (error.statusCode === 200) {
      return false;
    }
    throw error;
  }
};
