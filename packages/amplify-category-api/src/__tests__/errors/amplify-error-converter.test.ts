import { AmplifyError, AmplifyErrorType, AmplifyException } from 'amplify-cli-core';
import { AmplifyErrorConverter } from '../../errors/amplify-error-converter';

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
  expect(new AmplifyErrorConverter().create(error)).toBeInstanceOf(Error);
  expect(new AmplifyErrorConverter().create(error).name).toMatch(errorType);
});

test('returns adefault error if the error isnt instance of Error', async () => {
  expect(new AmplifyErrorConverter().create(amplifyError).name).toMatch('AmplifyStudioError');
});

test('returns user error if the error is present in list', async () => {
  // error name is user error list
  error.name = 'InvalidDirectiveError';
  expect(new AmplifyErrorConverter().create(error)).toBeInstanceOf(AmplifyException);
  expect(new AmplifyErrorConverter().create(error).name).toMatch('InvalidDirectiveError');
});
