import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * Given a codegen asset s3 uri, retrieve the file contents, and return as a string.
 * @param s3Uri the uri to retrieve from s3.
 * @returns the file contents as a string
 */
export const retrieveCodegenAsset = async (s3Uri: string): Promise<string> => {
  const { hostname: Bucket, pathname } = new URL(s3Uri);
  const Key = pathname.replace('/', '');

  const s3 = new S3Client({});

  const getObjectResponse = await s3.send(new GetObjectCommand({ Bucket, Key }));

  const asset = getObjectResponse.Body?.transformToString();
  if (!asset) {
    throw new Error('Expected to receive s3 object body, but did not');
  }
  return asset;
};
