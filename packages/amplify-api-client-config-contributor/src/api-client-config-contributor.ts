import { ApiOutput, ApiOutputKey } from '@aws-amplify/api-client-config-schema';
import { ApiClientConfig, ApiClientConfigMapping } from './api-client-config';

// no access to CLI types
// import { ClientConfigContributor } from './client_config_contributor.js';
// import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';

/**
 * Translator for the API portion of ClientConfig
 */
export class ApiClientConfigContributor {
  // no type safety on implements ClientConfigContributor
  // Build will succeed in data repo if missing contribute function
  // The build would fail in CLI repo if missing contribute function

  /**
   * Given some BackendOutput, contribute the data API portion of the client config
   */
  contribute(output: { [ApiOutputKey]: ApiOutput }): ApiClientConfig | Record<string, never> {
    const { apiOutput } = output;
    if (apiOutput === undefined) {
      return {};
    }
    return {
      aws_appsync_region: apiOutput.payload[ApiClientConfigMapping.aws_appsync_region],
      aws_appsync_graphqlEndpoint: apiOutput.payload[ApiClientConfigMapping.aws_appsync_graphqlEndpoint],
      aws_appsync_authenticationType: apiOutput.payload[ApiClientConfigMapping.aws_appsync_authenticationType],
      aws_appsync_apiKey: apiOutput.payload[ApiClientConfigMapping.aws_appsync_apiKey],
    };
  }
}
