/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable func-style */

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
