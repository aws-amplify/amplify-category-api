import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * TODO
 */
export const handler = async (event: {
  conversationId: string;
  attachmentKey: string;
}): Promise<{
  uploadUrl: string;
  downloadUrl: string;
}> => {
  console.log(JSON.stringify(event, null, 2));
  console.log(process.env);

  if (!process.env.S3_BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME environment variable must be defined');
  }

  const bucketName = process.env.S3_BUCKET_NAME;

  const client = new S3Client();
  const putCommand = new PutObjectCommand({ Bucket: bucketName, Key: `${event.conversationId}/${event.attachmentKey}` });
  const uploadUrl = await getSignedUrl(client, putCommand, { expiresIn: 3600 });

  const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: `${event.conversationId}/${event.attachmentKey}` });
  const downloadUrl = await getSignedUrl(client, getCommand, { expiresIn: 3600 });

  return {
    uploadUrl,
    downloadUrl,
  };
};
