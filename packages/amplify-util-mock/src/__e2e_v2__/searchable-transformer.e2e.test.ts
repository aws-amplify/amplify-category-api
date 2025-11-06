import { AmplifyAppSyncSimulator } from '@aws-amplify/amplify-appsync-simulator';
import { deploy, launchDDBLocal, logDebug, GraphQLClient, terminateDDB, defaultTransformParams, transformAndSynth } from '../__e2e__/utils';

jest.setTimeout(2000000);

let GRAPHQL_ENDPOINT: string;
let GRAPHQL_CLIENT: GraphQLClient;
let ddbEmulator = null;
let dbPath = null;
let server: AmplifyAppSyncSimulator;

describe('@searchable transformer', () => {
  beforeAll(async () => {
    const validSchema = `
      type Todo @model @searchable {
        id: ID!
      }`;

    try {
      const out = transformAndSynth({
        ...defaultTransformParams,
        schema: validSchema,
        transformParameters: {
          ...defaultTransformParams.transformParameters,
          sandboxModeEnabled: true,
        },
      });

      let ddbClient;
      ({ dbPath, emulator: ddbEmulator, client: ddbClient } = await launchDDBLocal());
      const result = await deploy(out, ddbClient);
      server = result.simulator;

      GRAPHQL_ENDPOINT = server.url + '/graphql';
      logDebug(`Using graphql url: ${GRAPHQL_ENDPOINT}`);

      const apiKey = result.config.appSync.apiKey;
      logDebug(apiKey);
      GRAPHQL_CLIENT = new GraphQLClient(GRAPHQL_ENDPOINT, {
        'x-api-key': apiKey,
      });
    } catch (e) {
      logDebug('error when setting up test');
      logDebug(e);
      expect(true).toEqual(false);
    }
  });

  afterAll(async () => {
    try {
      if (server) {
        await server.stop();
      }

      await terminateDDB(ddbEmulator, dbPath);
    } catch (e) {
      console.error(e);
      expect(true).toEqual(false);
    }
  });

  /**
   * Test queries below
   */
  test('@searchable allows the mock server to run', async () => {
    const response = await GRAPHQL_CLIENT.query(
      `query {
        searchTodos {
          items {
            id
          }
        }
      }`,
      {},
    );

    logDebug(JSON.stringify(response, null, 4));
    expect(response.data.searchTodos.items).toEqual([]);
  });
});
