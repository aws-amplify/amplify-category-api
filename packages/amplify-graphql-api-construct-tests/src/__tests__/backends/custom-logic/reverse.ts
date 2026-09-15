/**
 * Entry point for our lambda.
 */
export const handler = async (event: any): Promise<string> => {
  const messageToReverse: string = event.arguments.message;
  if (!messageToReverse) {
    throw new Error("Didn't receive a `message` to reverse");
  }
  return messageToReverse.split('').reduce((acc, char) => char + acc, '');
};
