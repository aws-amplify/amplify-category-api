import { RemovalPolicy } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export type CodegenAssetsProps = {
  modelSchema: string;
};

const MODEL_SCHEMA_KEY = 'model-schema.graphql';

/**
 * Construct an S3 URI string for a given bucket and key.
 * @param bucket the bucket to embed in the uri string
 * @param key the key to embed in the uri string
 * @returns the uri string representation.
 */
const getS3UriForBucketAndKey = (bucket: Bucket, key: string): string => `s3://${bucket.bucketName}/${key}`;

/**
 * Construct which creates a bucket, and uploads file assets required for codegen to run.
 * Pointers to these resources are persisted in the stack outputs.
 */
export class CodegenAssets extends Construct {
  public modelSchemaS3Uri: string;

  constructor(scope: Construct, id: string, props: CodegenAssetsProps) {
    super(scope, id);

    const bucket = new Bucket(this, `${id}Bucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new BucketDeployment(this, `${id}Deployment`, {
      destinationBucket: bucket,
      sources: [Source.data(MODEL_SCHEMA_KEY, props.modelSchema)],
      memoryLimit: 512,
    });

    this.modelSchemaS3Uri = getS3UriForBucketAndKey(bucket, MODEL_SCHEMA_KEY);
  }
}
