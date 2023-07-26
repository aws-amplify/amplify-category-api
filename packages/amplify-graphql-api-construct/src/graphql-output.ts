// Temp file until published in CLI

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
type BackendOutputEntry<T extends Record<string, string> = Record<string, string>> = {
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
