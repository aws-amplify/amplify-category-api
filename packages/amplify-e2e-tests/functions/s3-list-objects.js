const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const awsS3Client = new S3Client();
const bucketEnvVar = '{{bucketEnvVar}}'; // This value is replaced from test

exports.handler = async (event, context) => {
  let listObjects = await awsS3Client.send(
    new ListObjectsV2Command({
      Bucket: process.env[bucketEnvVar],
    }),
  );

  return listObjects;
};
