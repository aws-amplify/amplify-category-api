import { API } from 'aws-amplify';

export const reconfigureAmplifyAPI = (url: string, region: string, appSyncAuthType: string, apiKey?: string): void => {
  if (appSyncAuthType === 'API_KEY') {
    API.configure({
      aws_appsync_graphqlEndpoint: url,
      aws_appsync_region: region,
      aws_appsync_authenticationType: appSyncAuthType,
      aws_appsync_apiKey: apiKey,
    });
  } else {
    API.configure({
      aws_appsync_graphqlEndpoint: url,
      aws_appsync_region: region,
      aws_appsync_authenticationType: appSyncAuthType,
    });
  }
};

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
