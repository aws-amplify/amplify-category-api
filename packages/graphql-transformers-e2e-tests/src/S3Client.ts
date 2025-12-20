/* eslint-disable */
import fs from 'fs';
import {
  S3Client as S3ClientSDK,
  CreateBucketCommand,
  CreateBucketCommandOutput,
  PutBucketVersioningCommand,
  PutBucketVersioningCommandOutput,
  PutObjectCommand,
  PutObjectOutput,
  GetObjectCommand,
  GetObjectCommandOutput,
  ListObjectVersionsCommand,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  DeleteBucketCommand,
  DeleteBucketCommandOutput,
  ObjectVersion,
} from '@aws-sdk/client-s3';

export class S3Client {
  client: S3ClientSDK;

  constructor(public region: string) {
    this.client = new S3ClientSDK({ region: this.region });
  }

  async createBucket(bucketName: string): Promise<CreateBucketCommandOutput> {
    return this.client.send(new CreateBucketCommand({ Bucket: bucketName }));
  }

  async putBucketVersioning(bucketName: string): Promise<PutBucketVersioningCommandOutput> {
    return this.client.send(new PutBucketVersioningCommand({ Bucket: bucketName, VersioningConfiguration: { Status: 'Enabled' } }));
  }

  async uploadZIPFile(
    bucketName: string,
    filePath: string,
    s3key: string,
    contentType: string = 'application/zip',
  ): Promise<PutObjectOutput> {
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

  async uploadFile(bucketName: string, filePath: string, s3key: string): Promise<PutObjectOutput> {
    const fileContent = this.readFile(filePath);
    return this.client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3key,
        Body: fileContent,
      }),
    );
  }

  async putObject(bucketName: string, s3key: string, body: string | Buffer): Promise<PutObjectOutput> {
    return this.client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3key,
        Body: body,
      }),
    );
  }

  async getFileVersion(bucketName: string, s3key: string): Promise<GetObjectCommandOutput> {
    return this.client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: s3key,
      }),
    );
  }

  async getAllObjectVersions(bucketName: string): Promise<ObjectVersion[]> {
    let objectVersions: ObjectVersion[] = [];
    let isTruncated: boolean = false;
    let NextKeyMarker: string | undefined;
    let NextVersionIdMarker: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectVersionsCommand({
          Bucket: bucketName,
          KeyMarker: NextKeyMarker,
          VersionIdMarker: NextVersionIdMarker,
        }),
      );
      objectVersions.push(...(page.Versions || []));
      NextKeyMarker = page.NextKeyMarker;
      NextVersionIdMarker = page.NextVersionIdMarker;
      isTruncated = page.IsTruncated || false;
    } while (isTruncated);
    return objectVersions;
  }

  async deleteObjectVersion(bucketName: string, versionId: string, s3key: string): Promise<DeleteObjectCommandOutput> {
    return this.client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3key,
        VersionId: versionId,
      }),
    );
  }

  async deleteFile(bucketName: string, s3key: string): Promise<void> {
    const versions = await this.getAllObjectVersions(bucketName);
    for (const version of versions) {
      if (!version.VersionId) continue;
      await this.deleteObjectVersion(bucketName, version.VersionId, s3key);
    }
  }

  async deleteBucket(bucketName: string): Promise<DeleteBucketCommandOutput> {
    return this.client.send(
      new DeleteBucketCommand({
        Bucket: bucketName,
      }),
    );
  }

  async emptyBucket(bucketName: string): Promise<void> {
    const versions = await this.getAllObjectVersions(bucketName);
    for (const version of versions) {
      if (!version.VersionId) continue;
      await this.deleteObjectVersion(bucketName, version.VersionId, version.Key!);
    }
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
