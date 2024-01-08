import { $TSContext, FeatureFlags, stateManager } from '@aws-amplify/amplify-cli-core';
import { printer, prompter } from '@aws-amplify/amplify-prompts';
import { run } from '../../../commands/api/rebuild';

jest.mock('@aws-amplify/amplify-cli-core');
jest.mock('@aws-amplify/amplify-prompts');

const FeatureFlags_mock = jest.mocked(FeatureFlags);
const stateManager_mock = jest.mocked(stateManager);
const printer_mock = jest.mocked(printer);
const prompter_mock = jest.mocked(prompter);

FeatureFlags_mock.getBoolean.mockReturnValue(true);

beforeEach(jest.clearAllMocks);

const pushResourcesMock = jest.fn();

const context_stub = {
  amplify: {
    constructExeInfo: jest.fn(),
    pushResources: pushResourcesMock,
  },
  parameters: {
    first: 'resourceName',
  },
} as unknown as $TSContext;

it('prints error if iterative updates not enabled', async () => {
  FeatureFlags_mock.getBoolean.mockReturnValueOnce(false);

  await run(context_stub);

  expect(printer_mock.error.mock.calls.length).toBe(1);
  expect(pushResourcesMock.mock.calls.length).toBe(0);
});

it('exits early if no api in project', async () => {
  stateManager_mock.getMeta.mockReturnValueOnce({
    api: {},
  });

  await run(context_stub);

  expect(printer_mock.info.mock.calls.length).toBe(1);
  expect(pushResourcesMock.mock.calls.length).toBe(0);
});

it('asks for strong confirmation before continuing', async () => {
  stateManager_mock.getMeta.mockReturnValueOnce({
    api: {
      testapiname: {
        service: 'AppSync',
      },
    },
  });

  await run(context_stub);

  expect(prompter_mock.input.mock.calls.length).toBe(1);
  expect(pushResourcesMock.mock.calls.length).toBe(1);
  expect(pushResourcesMock.mock.calls[0][4]).toBe(true); // rebuild flag is set
});
