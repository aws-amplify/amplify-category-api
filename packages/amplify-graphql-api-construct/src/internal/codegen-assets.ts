import { RemovalPolicy, Fn } from 'aws-cdk-lib';
import { Bucket, HttpMethods, IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export type CodegenAssetsProps = {
  modelSchema: string;
};

const MODEL_SCHEMA_KEY = 'model-schema.graphql';
const CONSOLE_SERVICE_ENDPOINT = Fn.join('', ['https://', Fn.ref('AWS::Region'), '.console.aws.amazon.com/amplify']);

/**
 * Construct an S3 URI string for a given bucket and key.
 * @param bucket the bucket to embed in the uri string
 * @param key the key to embed in the uri string
 * @returns the uri string representation.
 */
const getS3UriForBucketAndKey = (bucket: IBucket, key: string): string => `s3://${bucket.bucketName}/${key}`;

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
      // Enabling CORS to allow console to access the codegen assets.
      cors: [
        {
          allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
          allowedHeaders: ['*'],
          allowedOrigins: [CONSOLE_SERVICE_ENDPOINT],
        },
      ],
    });

    const deployment = new BucketDeployment(this, `${id}Deployment`, {
      destinationBucket: bucket,
      sources: [Source.data(MODEL_SCHEMA_KEY, props.modelSchema)],
      // Bucket deployment uses a Lambda that runs AWS S3 CLI to transfer assets to destination bucket.
      // That Lambda requires higher memory setting to run fast even when processing small assets (less than 1kB).
      // This setting has been established experimentally. Benchmark can be found in pull request description that established it.
      // The value has been chosen to prefer the lowest cost (run time * memory demand) while providing reasonable performance.
      memoryLimit: 1536,
    });

    this.modelSchemaS3Uri = getS3UriForBucketAndKey(deployment.deployedBucket, MODEL_SCHEMA_KEY);
  }
}
