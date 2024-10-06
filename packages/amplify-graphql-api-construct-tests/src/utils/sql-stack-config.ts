import { AUTH_TYPE } from 'aws-appsync';

export interface StackConfig {
  /**
   * The AppSync GraphQL schema, provided as string for AmplifyGraphqlApi Construct definition.
   */
  schema: string;

  /**
   * The AuthorizationMode type for AmplifyGraphqlApi Construct.
   */
  authMode: AUTH_TYPE;

  /**
   * If true, disable Cognito User Pool/Auth resources creation and only use API Key auth in sandbox mode.
   */
  useSandbox?: boolean;

  /**
   * The OIDC options/config when using OIDC AuthorizationMode for AmplifyGraphqlApi Construct.
   *
   * @property {Record<string, string>} [triggers] - UserPoolTriggers for Cognito User Pool when provisioning the User Pool as OIDC provider.
   * - key: trigger name e.g. 'preTokenGeneration'
   * - value: the lambda function code inlined as a string
   *
   * **NOTE**
   * - Only applicable when AuthorizationMode is set to OIDC.
   * - Currently only supports Cognito User Pools as the simulated OIDC provider for E2E test.
   * - Currently only supports JavaScript as the lambda function code, with Node.js runtime version 18.x.
   * - Inline code needs to export the handler function as `handler` as `index.handler` would be used as the handler path.
   */
  oidcOptions?: {
    triggers?: Record<string, string>;
  };
}
