import fs = require('fs');
import {
  S3Client as S3ClientV3,
  CreateBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteBucketCommand,
  GetObjectCommand,
  ListObjectVersionsCommand,
  PutBucketVersioningCommand,
} from '@aws-sdk/client-s3';

export class S3Client {
  client: S3ClientV3;

  constructor(public region: string) {
    this.client = new S3ClientV3({ region: this.region });
  }

  async createBucket(bucketName: string) {
    return this.client.send(
      new CreateBucketCommand({
        Bucket: bucketName,
      }),
    );
  }

  async putBucketVersioning(bucketName: string) {
    return this.client.send(
      new PutBucketVersioningCommand({
        Bucket: bucketName,
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      }),
    );
  }

  async uploadZIPFile(bucketName: string, filePath: string, s3key: string, contentType: string = 'application/zip') {
    const fileContent = this.readZIPFile(filePath);

    return this.client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3key,
        Body: fileContent,
        ContentType: contentType,
      }),
    );
  }

  async uploadFile(bucketName: string, filePath: string, s3key: string) {
    const fileContent = this.readFile(filePath);

    return this.client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3key,
        Body: fileContent,
      }),
    );
  }

  async putObject(bucketName: string, s3key: string, body: string | Buffer) {
    return this.client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3key,
        Body: body,
      }),
    );
  }

  async getFileVersion(bucketName: string, s3key: string) {
    return this.client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: s3key,
      }),
    );
  }

  async getAllObjectVersions(bucketName: string) {
    return this.client.send(
      new ListObjectVersionsCommand({
        Bucket: bucketName,
      }),
    );
  }

  async deleteObjectVersion(bucketName: string, versionId: string, s3key: string) {
    return this.client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3key,
        VersionId: versionId,
      }),
    );
  }

  async deleteFile(bucketName: string, s3key: string) {
    const response = await this.getAllObjectVersions(bucketName);
    const versions = response.Versions;
    for (const version of versions) {
      await this.deleteObjectVersion(bucketName, version.VersionId, s3key);
    }
  }

  async deleteBucket(bucketName: string) {
    return this.client.send(
      new DeleteBucketCommand({
        Bucket: bucketName,
      }),
    );
  }

  async setUpS3Resources(bucketName: string, filePath: string, s3key: string, zip?: boolean) {
    await this.createBucket(bucketName);
    await this.putBucketVersioning(bucketName);
    if (zip) {
      await this.uploadZIPFile(bucketName, filePath, s3key);
    } else {
      await this.uploadFile(bucketName, filePath, s3key);
    }
    return await this.getFileVersion(bucketName, s3key);
  }

  async cleanUpS3Resources(bucketName: string, s3key: string) {
    await this.deleteFile(bucketName, s3key);
    await this.deleteBucket(bucketName);
  }

  private readFile(filePath: string) {
    return fs.readFileSync(filePath, 'utf8');
  }

  private readZIPFile(filePath: string) {
    return fs.createReadStream(filePath);
  }

  public async wait<T>(secs: number, fun: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
    return new Promise<T>((resolve) => {
      setTimeout(() => {
        resolve(fun.apply(this, args));
      }, 1000 * secs);
    });
  }
}
