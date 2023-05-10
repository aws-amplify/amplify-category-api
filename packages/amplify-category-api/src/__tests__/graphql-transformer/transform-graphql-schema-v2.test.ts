import { $TSContext, pathManager } from "@aws-amplify/amplify-cli-core";
import { printer } from "@aws-amplify/amplify-prompts";
import { ApiCategoryFacade, FeatureFlags } from "@aws-amplify/amplify-cli-core";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { transformGraphQLSchemaV2 } from "../../graphql-transformer/transform-graphql-schema-v2";
import { generateTransformerOptions } from "../../graphql-transformer/transformer-options-v2";
import { parseUserDefinedSlots } from "../../graphql-transformer/user-defined-slots";
import { getTransformerFactory } from "../../graphql-transformer/transformer-factory";
import { getAppSyncAPIName } from "../../provider-utils/awscloudformation/utils/amplify-meta-utils";

jest.mock("@aws-amplify/amplify-cli-core");
jest.mock("@aws-amplify/amplify-prompts");
jest.mock("../../graphql-transformer/transformer-options-v2");
jest.mock("../../graphql-transformer/user-defined-slots");
jest.mock("../../provider-utils/awscloudformation/utils/amplify-meta-utils");

describe("transformGraphQLSchemaV2", () => {
  const testProjectPath = path.resolve(__dirname, "mock-projects", "project");
  const resourceDir = (projectDir: string) => path.join(projectDir, "amplify", "backend", "api", "testapi");
  const envName = "testtest";
  let tempProjectDir: string;
  let contextMock;
  const printerMock = printer as jest.Mocked<typeof printer>;
  const pathManagerMock = pathManager as jest.Mocked<typeof pathManager>;
  const generateTransformerOptionsMock = generateTransformerOptions as jest.Mock;
  const parseUserDefinedSlotsMock = parseUserDefinedSlots as jest.Mock;
  const getAppSyncAPINameMock = getAppSyncAPIName as jest.Mock;
  const ApiCategoryFacadeMock = ApiCategoryFacade as jest.Mocked<typeof ApiCategoryFacade>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const randomSuffix = (Math.random() * 10000).toString().split(".")[0];
    tempProjectDir = path.join(os.tmpdir(), `schema-migrator-test-${randomSuffix}`);

    await fs.copy(testProjectPath, tempProjectDir);
    jest.spyOn(pathManager, "findProjectRoot").mockReturnValue(tempProjectDir);
    FeatureFlags.initialize({ getCurrentEnvName: () => envName });
  });

  afterEach(async () => {
    await fs.remove(tempProjectDir);
  });

  test("tranformer logs are passed up", async () => {
    contextMock = {
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
              output: { authConfig: { defaultAuthentication: { authenticationType: 'AMAZON_COGNITO_USER_POOLS' } } },
            },
          ],
          resourcesToBeUpdated: [],
          allResources: [],
        })),
      },
      parameters: {
        options: { resourcesDir: resourceDir(tempProjectDir), projectDirectory: tempProjectDir },
      },
      mergeResources: jest.fn(),
      authConfig: { defaultAuthentication: { authenticationType: 'AMAZON_COGNITO_USER_POOLS' } },
    } as unknown as $TSContext;
    printerMock.warn.mockImplementation(jest.fn());
    pathManagerMock.getBackendDirPath.mockReturnValue("backenddir");
    pathManagerMock.getCurrentCloudBackendDirPath.mockReturnValue("currentcloudbackenddir");
    ApiCategoryFacadeMock.getTransformerVersion.mockReturnValue(Promise.resolve(2));
    generateTransformerOptionsMock.mockReturnValue({
      projectConfig: {
        schema: `
          type Post @model {
            id: ID!
            content: String
            type: String!
            category: String
            author: String
            editors: [String!]
            owner: String
            groups: [String!]
            slug: String!
            likeCount: Int
            rating: Int
          }
          type Todo @model @auth(rules: [{ allow: owner }]) {
  content: String
}
        `,
        config: { StackMapping: {} },
        pipelineFunction: "",
        resolvers: "",
      },
      transformersFactory: await getTransformerFactory(contextMock, resourceDir(tempProjectDir)),
      transformersFactoryArgs: {
      },
      dryRun: true,
      mergeResources: jest.fn(),
      projectDirectory: tempProjectDir,
        "authConfig": {
          "additionalAuthenticationProviders": [],
          "defaultAuthentication": {
            "authenticationType": "AMAZON_COGNITO_USER_POOLS",
            "userPoolConfig": {
              "userPoolId": "authtestapi84e38938"
            }
          }
        }
    });
    parseUserDefinedSlotsMock.mockReturnValue({});
    getAppSyncAPINameMock.mockReturnValue(["testapi"]);

    await transformGraphQLSchemaV2(contextMock, {
        "authConfig": {
          "additionalAuthenticationProviders": [],
          "defaultAuthentication": {
            "authenticationType": "AMAZON_COGNITO_USER_POOLS",
            "userPoolConfig": {
              "userPoolId": "authtestapi84e38938"
            }
          }
        }
    });
    expect(printerMock.warn).toBeCalledWith(" WARNING: Amplify CLI will change the default identity claim from 'username' to use 'sub::username'. To continue using only usernames, set 'identityClaim: \"username\"' on your 'owner' rules on your schema. The default will be officially switched with v9.0.0. To read more: https://docs.amplify.aws/cli/migration/identity-claim-changes/");
    expect(printerMock.warn).toBeCalledWith("WARNING: owners may reassign ownership for the following model(s) and role(s): Todo: [owner]. If this is not intentional, you may want to apply field-level authorization rules to these fields. To read more: https://docs.amplify.aws/cli/graphql/authorization-rules/#per-user--owner-based-data-access.");
  });
});
