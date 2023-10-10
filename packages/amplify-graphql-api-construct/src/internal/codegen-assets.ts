import { RemovalPolicy } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export type CodegenAssetsProps = {
  modelSchema: string;
  modelIntrospectionSchema?: string;
};

const MODEL_SCHEMA_KEY = 'model-schema.graphql';
const MODEL_INTROSPECTION_SCHEMA_KEY = 'model-introspection-schema.graphql';

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
  public modelIntrospectionSchemaS3Uri: string | undefined;

  constructor(scope: Construct, id: string, props: CodegenAssetsProps) {
    super(scope, id);

    const bucket = new Bucket(this, `${id}Bucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const sources = [Source.data(MODEL_SCHEMA_KEY, props.modelSchema)];

    if (props.modelIntrospectionSchema) {
      sources.push(Source.data(MODEL_INTROSPECTION_SCHEMA_KEY, props.modelIntrospectionSchema));
    }

    new BucketDeployment(this, `${id}Deployment`, {
      destinationBucket: bucket,
      sources,
      // Bucket deployment uses a Lambda that runs AWS S3 CLI to transfer assets to destination bucket.
      // That Lambda requires higher memory setting to run fast even when processing small assets (less than 1kB).
      // This setting has been established experimentally. Benchmark can be found in pull request description that established it.
      // The value has been chosen to prefer the lowest cost (run time * memory demand) while providing reasonable performance.
      memoryLimit: 1536,
    });

    this.modelSchemaS3Uri = getS3UriForBucketAndKey(bucket, MODEL_SCHEMA_KEY);
    this.modelIntrospectionSchemaS3Uri = props.modelIntrospectionSchema
      ? getS3UriForBucketAndKey(bucket, MODEL_INTROSPECTION_SCHEMA_KEY)
      : undefined;
  }
}
