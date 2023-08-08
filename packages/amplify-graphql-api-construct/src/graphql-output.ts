// Temp file until published in CLI

import { CfnOutput, Stack } from 'aws-cdk-lib';
import { z } from 'zod';

const AwsAppsyncAuthenticationType = z.enum(['API_KEY', 'AWS_LAMBDA', 'AWS_IAM', 'OPENID_CONNECT', 'AMAZON_COGNITO_USER_POOLS']);
export type AwsAppsyncAuthenticationType = z.infer<typeof AwsAppsyncAuthenticationType>;

export const graphqlOutputSchemaV1 = z.object({
  version: z.literal('1'),
  payload: z.object({
    awsAppsyncRegion: z.string(),
    awsAppsyncApiEndpoint: z.string(),
    awsAppsyncAuthenticationType: AwsAppsyncAuthenticationType,
    awsAppsyncApiKey: z.string().optional(),
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

type BackendOutput = Record<string, BackendOutputEntry>;

export type BackendOutputStorageStrategy<T extends BackendOutputEntry> = {
  addBackendOutputEntry(keyName: string, backendOutputEntry: T): void;

  /**
   * Write all pending data to the destination
   */
  flush(): void;
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
export class StackMetadataBackendOutputStorageStrategy implements BackendOutputStorageStrategy<BackendOutputEntry> {
  private readonly metadata: BackendOutputStackMetadata = {};
  /**
   * Initialize the instance with a stack.
   *
   * If the stack is an AmplifyStack, set a parameter in SSM so the stack can be identified later by the project environment
   */
  constructor(private readonly stack: Stack) {}

  /**
   * Store construct output as stack output and add pending metadata to the metadata object.
   *
   * Metadata is not written to the stack until flush() is called
   */
  addBackendOutputEntry(keyName: string, backendOutputEntry: BackendOutputEntry): void {
    // add all the data values as stack outputs
    Object.entries(backendOutputEntry.payload).forEach(([key, value]) => {
      new CfnOutput(this.stack, key, { value });
    });

    this.metadata[keyName] = {
      version: backendOutputEntry.version,
      stackOutputs: Object.keys(backendOutputEntry.payload),
    };
  }

  /**
   * Persists the metadata object to the stack metadata
   */
  flush(): void {
    this.stack.addMetadata(amplifyStackMetadataKey, this.metadata);
  }
}
