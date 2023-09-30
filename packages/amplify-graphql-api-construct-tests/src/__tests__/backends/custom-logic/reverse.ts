/**
 * Entry point for our lambda.
 */
export const handler = (event: any, _: any, callback: (errorMsg: string | null, responseMsg?: string | null) => void) => {
  const messageToReverse: string = event.arguments.message;
  if (!messageToReverse) {
    callback("Didn't receive a `message` to reverse");
  }
  callback(
    null,
    messageToReverse.split('').reduce((acc, char) => char + acc, ''),
  );
};
