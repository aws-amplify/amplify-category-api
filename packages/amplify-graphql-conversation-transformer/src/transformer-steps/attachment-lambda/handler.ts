import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * TODO
 */
export const handler = async (event: {
  conversationId: string;
}): Promise<{
  url: string;
}> => {
  console.log(JSON.stringify(event, null, 2));
  console.log(process.env);

  if (!process.env.S3_BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME environment variable must be defined');
  }

  const bucketName = process.env.S3_BUCKET_NAME;

  const client = new S3Client();
  const attachmentKey = crypto.randomUUID();
  const command = new PutObjectCommand({ Bucket: bucketName, Key: `${event.conversationId}/${attachmentKey}` });
  const url = await getSignedUrl(client, command, { expiresIn: 3600 });

  return {
    url,
  };
};
