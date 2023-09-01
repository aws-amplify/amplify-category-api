// Temp file until published in CLI

import { CfnOutput, Stack } from 'aws-cdk-lib';
import { z } from 'zod';
import { IBackendOutputStorageStrategy } from './types';

const AwsAppsyncAuthenticationType = z.enum(['API_KEY', 'AWS_LAMBDA', 'AWS_IAM', 'OPENID_CONNECT', 'AMAZON_COGNITO_USER_POOLS']);
export type AwsAppsyncAuthenticationType = z.infer<typeof AwsAppsyncAuthenticationType>;

export const graphqlOutputSchemaV1 = z.object({
  version: z.literal('1'),
  payload: z.object({
    awsAppsyncRegion: z.string(),
    awsAppsyncApiEndpoint: z.string(),
    awsAppsyncAuthenticationType: AwsAppsyncAuthenticationType,
    awsAppsyncApiKey: z.string().optional(),
    awsAppsyncApiId: z.string(),
    amplifyApiModelSchemaS3Uri: z.string(),
  }),
});

export const versionedGraphqlOutputSchema = z.discriminatedUnion('version', [
  graphqlOutputSchemaV1,
  // this is where additional api major version schemas would go
]);

export type GraphqlOutput = z.infer<typeof versionedGraphqlOutputSchema>;

export const GraphqlOutputKey = 'graphqlOutput';

// Types that need to be exported from CLI types package
export type BackendOutputEntry<T extends Record<string, string> = Record<string, string>> = {
  readonly version: string;
  readonly payload: T;
};

export const amplifyStackMetadataKey = 'AWS::Amplify::Output';

export const backendOutputEntryStackMetadataSchema = z.object({
  version: z.string(),
  stackOutputs: z.array(z.string()),
});

/**
 * Inferred type from backendOutputEntryStackMetadataSchema
 */
export type BackendOutputEntryStackMetadata = z.infer<typeof backendOutputEntryStackMetadataSchema>;

/**
 * Data schema for storing backend output using stack metadata
 */
export const backendOutputStackMetadataSchema = z.record(backendOutputEntryStackMetadataSchema);

/**
 * Inferred type from backendOutputStackMetadataSchema
 */
export type BackendOutputStackMetadata = z.infer<typeof backendOutputStackMetadataSchema>;

/**
 * Implementation of BackendOutputStorageStrategy that stores config data in stack metadata and outputs
 */
export class StackMetadataBackendOutputStorageStrategy implements IBackendOutputStorageStrategy {
  private readonly metadata: BackendOutputStackMetadata = {};
  private backendOutputEntry?: BackendOutputEntry;

  static isStackMetadataBackendOutputStorageStrategy(
    strategy: IBackendOutputStorageStrategy,
  ): strategy is StackMetadataBackendOutputStorageStrategy {
    return strategy instanceof StackMetadataBackendOutputStorageStrategy;
  }

  /**
   * Initialize the instance with a stack.
   *
   * If the stack is an AmplifyStack, set a parameter in SSM so the stack can be identified later by the project environment
   */
  constructor(private readonly stack: Stack) {}

  setBackendOutputEntry(backendOutputEntry: BackendOutputEntry): void {
    this.backendOutputEntry = backendOutputEntry;
  }

  /**
   * Store construct output as stack output and add pending metadata to the metadata object.
   *
   * Metadata is not written to the stack until flush() is called
   */
  addBackendOutputEntry(keyName: string): void {
    if (!this.backendOutputEntry) {
      return;
    }

    // add all the data values as stack outputs
    Object.entries(this.backendOutputEntry.payload).forEach(([key, value]) => {
      new CfnOutput(this.stack, key, { value });
    });

    this.metadata[keyName] = {
      version: this.backendOutputEntry.version,
      stackOutputs: Object.keys(this.backendOutputEntry.payload),
    };
  }

  /**
   * Persists the metadata object to the stack metadata
   */
  flush(): void {
    this.stack.addMetadata(amplifyStackMetadataKey, this.metadata);
  }
}
