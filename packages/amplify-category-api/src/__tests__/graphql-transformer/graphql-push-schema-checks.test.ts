const getParamMock = jest.fn();

import {
  $TSContext,
  ApiCategoryFacade,
  getGraphQLTransformerOpenSearchProductionDocLink,
  stateManager,
} from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import { searchablePushChecks } from '../../graphql-transformer/api-utils';

jest.mock('@aws-amplify/amplify-cli-core');
jest.mock('@aws-amplify/amplify-prompts');

jest.mock('@aws-amplify/amplify-environment-parameters', () => ({
  ensureEnvParamManager: jest.fn().mockResolvedValue({
    instance: {
      getResourceParamManager: jest.fn().mockReturnValue({
        getParam: getParamMock,
      }),
    },
  }),
}));

const printerMock = printer as jest.Mocked<typeof printer>;
const stateManagerMock = stateManager as jest.Mocked<typeof stateManager>;
const getTransformerVersionMock = ApiCategoryFacade.getTransformerVersion as jest.MockedFunction<
  typeof ApiCategoryFacade.getTransformerVersion
>;
const getGraphQLTransformerOpenSearchProductionDocLinkMock = getGraphQLTransformerOpenSearchProductionDocLink as jest.MockedFunction<
  typeof getGraphQLTransformerOpenSearchProductionDocLink
>;
printerMock.warn.mockImplementation(jest.fn());
getGraphQLTransformerOpenSearchProductionDocLinkMock.mockReturnValue('mockDocsLink');
// use transformer v2 for tests
getTransformerVersionMock.mockReturnValue(new Promise((resolve) => resolve(2)));

describe('graphql schema checks', () => {
  const contextMock = {
    amplify: {
      getEnvInfo: jest.fn(),
    },
  } as unknown as $TSContext;

  const printerWarning =
    'Your instance type for OpenSearch is t2.small.elasticsearch, you may experience performance issues or data loss.' +
    ' Consider reconfiguring with the instructions here mockDocsLink';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should warn users if they use not recommended open search instance without overrides', async () => {
    stateManagerMock.getLocalEnvInfo.mockReturnValue({ envName: 'test' });
    getParamMock.mockReturnValueOnce(undefined);
    const map = { Post: ['model', 'searchable'] };
    await searchablePushChecks(contextMock, map, 'test_api_name');
    expect(printerMock.warn).lastCalledWith(printerWarning);
  });

  it('should warn users if they use not recommended open search instance with overrides', async () => {
    getParamMock.mockReturnValueOnce('t2.small.elasticsearch');
    stateManagerMock.getLocalEnvInfo.mockReturnValue({ envName: 'test' });
    const map = { Post: ['model', 'searchable'] };
    await searchablePushChecks(contextMock, map, 'test_api_name');
    expect(printerMock.warn).lastCalledWith(printerWarning);
  });

  it('should warn users if they use not recommended elastic search instance with overrides', async () => {
    getParamMock.mockReturnValueOnce('t2.small.elasticsearch');
    stateManagerMock.getLocalEnvInfo.mockReturnValue({ envName: 'test' });
    const map = { Post: ['model', 'searchable'] };
    await searchablePushChecks(contextMock, map, 'test_api_name');
    expect(printerMock.warn).lastCalledWith(printerWarning);
  });

  it('should NOT warn users if they use recommended open search instance', async () => {
    getParamMock.mockReturnValueOnce('t2.medium.elasticsearch');
    stateManagerMock.getLocalEnvInfo.mockReturnValue({ envName: 'test' });
    const map = { Post: ['model', 'searchable'] };
    await searchablePushChecks(contextMock, map, 'test_api_name');
    expect(printerMock.warn).not.toBeCalled();
  });

  it('should NOT warn users if they use recommended elastic search instance', async () => {
    getParamMock.mockReturnValueOnce('t2.medium.elasticsearch');
    stateManagerMock.getLocalEnvInfo.mockReturnValue({ envName: 'test' });
    const map = { Post: ['model', 'searchable'] };
    await searchablePushChecks(contextMock, map, 'test_api_name');
    expect(printerMock.warn).not.toBeCalled();
  });

  it('should NOT warn users if they use recommended open search instance on the environment', async () => {
    getParamMock.mockReturnValueOnce('t2.medium.elasticsearch');
    stateManagerMock.getLocalEnvInfo.mockReturnValue({ envName: 'prod' });
    const map = { Post: ['model', 'searchable'] };
    await searchablePushChecks(contextMock, map, 'test_api_name');
    expect(printerMock.warn).not.toBeCalled();
  });

  it('should NOT warn users if they use recommended elastic search instance on the environment', async () => {
    getParamMock.mockReturnValueOnce('t2.medium.elasticsearch');
    stateManagerMock.getLocalEnvInfo.mockReturnValue({ envName: 'prod' });
    const map = { Post: ['model', 'searchable'] };
    await searchablePushChecks(contextMock, map, 'test_api_name');
    expect(printerMock.warn).not.toBeCalled();
  });

  it('should NOT warn users if they do NOT use searchable', async () => {
    getParamMock.mockReturnValueOnce(undefined);
    stateManagerMock.getLocalEnvInfo.mockReturnValue({ envName: 'test' });
    const map = { Post: ['model'] };
    await searchablePushChecks(contextMock, map, 'test_api_name');
    expect(printerMock.warn).not.toBeCalled();
  });

  it('should warn users if they use not recommended open search instance with overrides', async () => {
    getParamMock.mockReturnValueOnce(undefined);
    stateManagerMock.getLocalEnvInfo.mockReturnValue({ envName: 'test' });
    const map = { Post: ['model', 'searchable'] };
    await searchablePushChecks(contextMock, map, 'test_api_name');
    expect(printerMock.warn).lastCalledWith(printerWarning);
  });
});
