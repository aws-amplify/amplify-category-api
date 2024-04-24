import { withRetries  } from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/util';

test('withRetries() will invoke a throwing function multiple times', async () => {
    let invocations = 0;
    const retryOptions = {
      attempts: 3,
      sleep: 0,
    };

    await expect(() => withRetries(retryOptions, async () => {
      invocations += 1;
      throw new Error('Ruh roh!');
    })()).rejects.toThrow(/Ruh roh!/);

    expect(invocations).toBeGreaterThan(1);
  });
