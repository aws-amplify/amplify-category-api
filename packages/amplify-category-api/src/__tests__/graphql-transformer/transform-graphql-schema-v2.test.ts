import { $TSContext, pathManager } from "@aws-amplify/amplify-cli-core";
import { printer } from "@aws-amplify/amplify-prompts";
import { ApiCategoryFacade } from "@aws-amplify/amplify-cli-core";
import { transformGraphQLSchemaV2 } from "../../graphql-transformer/transform-graphql-schema-v2";
import { generateTransformerOptions } from "../../graphql-transformer/transformer-options-v2";
import { getAppSyncAPIName } from "../../provider-utils/awscloudformation/utils/amplify-meta-utils";
import { constructTransformerChain } from "../../amplify-graphql-transform/graphql-transformer-v2";

jest.mock("@aws-amplify/amplify-cli-core");
jest.mock("@aws-amplify/amplify-prompts");
jest.mock("graphql-transformer-core");
jest.mock("../../graphql-transformer/transformer-options-v2");
jest.mock("../../graphql-transformer/user-defined-slots");
jest.mock("../../provider-utils/awscloudformation/utils/amplify-meta-utils");

describe("transformGraphQLSchemaV2", () => {
  const printerMock = printer as jest.Mocked<typeof printer>;
  const pathManagerMock = pathManager as jest.Mocked<typeof pathManager>;
  const ApiCategoryFacadeMock = ApiCategoryFacade as jest.Mocked<typeof ApiCategoryFacade>;
  const generateTransformerOptionsMock = generateTransformerOptions as jest.Mock;
  const getAppSyncAPINameMock = getAppSyncAPIName as jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  test("tranformer logs are passed up", async () => {
    const contextMock = {
      amplify: {
        getEnvInfo: jest.fn(),
        invokePluginMethod: jest.fn(),
        getResourceStatus: jest.fn(() => ({
          resourcesToBeCreated: [
            {
              service: "AppSync",
              providerPlugin: "awscloudformation",
              resourceName: "mock resource",
              category: "api",
              output: {},
            },
          ],
          resourcesToBeUpdated: [],
          allResources: [],
        })),
      },
      parameters: {
        options: { resourcesDir: "resourceDir", projectDirectory: __dirname },
      },
      mergeResources: jest.fn(),
    } as unknown as $TSContext;
    pathManagerMock.getBackendDirPath.mockReturnValue("backenddir");
    pathManagerMock.getCurrentCloudBackendDirPath.mockReturnValue("currentcloudbackenddir");
    ApiCategoryFacadeMock.getTransformerVersion.mockReturnValue(Promise.resolve(2));
    generateTransformerOptionsMock.mockReturnValue({
      projectConfig: {
        // schema that will generate auth warnings
        schema: `
          type Todo @model @auth(rules: [{ allow: owner }]) {
            content: String
          }
        `,
        config: { StackMapping: {} },
      },
      transformersFactory: constructTransformerChain({ authConfig: {}, customTransformers: [] }),
      transformersFactoryArgs: {},
      dryRun: true,
      projectDirectory: __dirname,
      authConfig: {
        additionalAuthenticationProviders: [],
        defaultAuthentication: {
          authenticationType: "AMAZON_COGNITO_USER_POOLS",
        },
      },
    });
    getAppSyncAPINameMock.mockReturnValue(["testapi"]);

    await transformGraphQLSchemaV2(contextMock, {});
    expect(printerMock.warn).toBeCalledWith(
      " WARNING: Amplify CLI will change the default identity claim from 'username' to use 'sub::username'. To continue using only usernames, set 'identityClaim: \"username\"' on your 'owner' rules on your schema. The default will be officially switched with v9.0.0. To read more: https://docs.amplify.aws/cli/migration/identity-claim-changes/"
    );
    expect(printerMock.warn).toBeCalledWith(
      "WARNING: owners may reassign ownership for the following model(s) and role(s): Todo: [owner]. If this is not intentional, you may want to apply field-level authorization rules to these fields. To read more: https://docs.amplify.aws/cli/graphql/authorization-rules/#per-user--owner-based-data-access."
    );
  });
});
