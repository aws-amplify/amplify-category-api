import { getEnv, log, withRetries } from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/util';

test('withRetries() will invoke a throwing function multiple times', async () => {
  let invocations = 0;
  const retryOptions = {
    attempts: 3,
    sleep: 0,
  };

  await expect(() =>
    withRetries(retryOptions, async () => {
      invocations += 1;
      throw new Error('Ruh roh!');
    })(),
  ).rejects.toThrow(/Ruh roh!/);

  expect(invocations).toBeGreaterThan(1);
});

test('getEnv succeeds with existing / fails with non-existing', () => {
  process.env['FOO'] = 'BAR';
  const fooValue = getEnv('FOO');
  expect(fooValue).toEqual('BAR');
  expect(() => getEnv('')).toThrow();
});

test('log helper coverage', () => {
  log('foo', 'bar');
  log('foo', { bar: 'baz' });
});
