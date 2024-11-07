import { ModelDataSourceStrategy, AppSyncAuthConfiguration, TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DeploymentResources, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ResolverTransformer } from '../graphql-resolver-transformer';

describe('ResolverTransformer', () => {
  describe('valid schemas', () => {
    it('should transform a single function definition', () => {
      const inputSchema = /* GraphQL */ `
        type Query {
          foo(bar: Int): String @resolver(functions: [{ dataSource: "NONE", entry: "export const request = () => { return {} }" }])
        }
      `;

      const out = transform(inputSchema);
      expect(out).toBeDefined();
    });
  });
});

const defaultAuthConfig: AppSyncAuthConfiguration = {
  defaultAuthentication: {
    authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  },
  additionalAuthenticationProviders: [],
};

const transform = (
  inputSchema: string,
  dataSourceStrategies?: Record<string, ModelDataSourceStrategy>,
  authConfig: AppSyncAuthConfiguration = defaultAuthConfig,
): DeploymentResources => {
  const transformers: TransformerPluginProvider[] = [new ResolverTransformer()];

  const out = testTransform({
    schema: inputSchema,
    authConfig,
    transformers,
    dataSourceStrategies,
  });

  return out;
};
