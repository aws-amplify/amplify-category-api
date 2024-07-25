import { AmplifyError, AmplifyErrorType, AmplifyException } from '@aws-amplify/amplify-cli-core';
import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { AmplifyGraphQLTransformerErrorConverter } from '../../errors/amplify-error-converter';
import { InvalidOverrideError } from '../../graphql-transformer/override';

const errorType: AmplifyErrorType = 'DeploymentError';
// converted error to amplifyException
const error = new Error('mockMessage');
error.name = errorType;
/**
 * deepest amplify exception to get printed if amplify fault is thrown
 */

const amplifyError = new AmplifyError('AmplifyStudioError', {
  message: 'mockMessage',
});

test('returns error if the error isnt mentioned in list', async () => {
  expect(AmplifyGraphQLTransformerErrorConverter.convert(error)).toBeInstanceOf(Error);
  expect(AmplifyGraphQLTransformerErrorConverter.convert(error).name).toMatch(errorType);
});

test('returns a default error if the error isnt instance of Error', async () => {
  expect(AmplifyGraphQLTransformerErrorConverter.convert(amplifyError).name).toMatch('AmplifyStudioError');
});

test('returns user error if the error is present in list', async () => {
  // error name is user error list
  error.name = 'InvalidDirectiveError';
  expect(AmplifyGraphQLTransformerErrorConverter.convert(error)).toBeInstanceOf(AmplifyException);
  expect(AmplifyGraphQLTransformerErrorConverter.convert(error).name).toMatch('InvalidDirectiveError');
});

test('returns all properties if the error is present in list', async () => {
  const originalError = new Error('original error message');
  const invalidOverrideError = new InvalidOverrideError(originalError);
  const amplifyError = AmplifyGraphQLTransformerErrorConverter.convert(invalidOverrideError);
  expect(amplifyError).toBeInstanceOf(AmplifyException);
  expect(amplifyError.name).toEqual('InvalidOverrideError');
  expect(amplifyError.details).toEqual(originalError.message);
  expect(amplifyError.resolution).toEqual('There may be runtime errors in your overrides file. If so, fix the errors and try again.');
});

test('message is included if not overridden', () => {
  const message = 'invalid directive message';
  // Invalid directive error does not override the message
  const invalidDirectiveError = new InvalidDirectiveError(message);
  expect(AmplifyGraphQLTransformerErrorConverter.convert(invalidDirectiveError).message).toEqual(message);
});
