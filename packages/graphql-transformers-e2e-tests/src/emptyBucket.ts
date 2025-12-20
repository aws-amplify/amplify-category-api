import { S3Client } from './S3Client';
import { resolveTestRegion } from './testSetup';

const region = resolveTestRegion();
const customS3Client = new S3Client(region);

/**
 * Empties *and **deletes*** a bucket.
 */
const emptyBucket = async (bucket: string): Promise<void> => {
  await customS3Client.emptyBucket(bucket);
  await customS3Client.deleteBucket(bucket);
};

export default emptyBucket;
