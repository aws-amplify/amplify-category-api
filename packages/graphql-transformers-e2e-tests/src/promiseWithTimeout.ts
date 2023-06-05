/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable func-style */

/**
 *
 * @param promiseToWait
 * @param timeout
 * @param timeoutMessage
 * @param cleanupFn
 */
export async function withTimeOut<T>(
  promiseToWait: Promise<T>,
  timeout: number,
  timeoutMessage?: string,
  cleanupFn?: () => void,
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(async () => {
      if (cleanupFn) {
        await cleanupFn();
      }
      reject(new Error(timeoutMessage || 'Waiting timed out'));
    }, timeout);
  });
  return Promise.race([promiseToWait, timeoutPromise]);
}

/**
 *
 * @param promiseToWait
 * @param timeout
 * @param timeoutMessage
 * @param cleanupFn
 */
export async function expectTimeOut(
  promiseToWait: Promise<any>,
  timeout: number,
  timeoutMessage: string,
  cleanupFn?: () => void,
): Promise<string> {
  const timeoutPromise = new Promise<string>((resolve, _) => {
    setTimeout(async () => {
      if (cleanupFn) {
        await cleanupFn();
      }
      resolve(timeoutMessage);
    }, timeout);
  });
  return Promise.race([promiseToWait, timeoutPromise]);
}
