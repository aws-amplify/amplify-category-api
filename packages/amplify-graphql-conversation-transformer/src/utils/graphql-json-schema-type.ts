// TODO: look at JSON schema type definitions from the PR
// https://github.com/aws-amplify/amplify-backend/pull/1752/files#diff-78ea7749a81fb516e54d12e70f82580e679419e05b1f0fc18e869286a6bd6add
export const convertGraphQlTypeToJsonSchemaType = (graphQlType: string): string => {
  switch (graphQlType) {
    case 'String':
      return 'string';
    case 'Int':
      return 'number';
    case 'ID':
      return 'string';
    case 'Float':
      return 'number';
    case 'Boolean':
      return 'boolean';
    // TODO: can we support dates reasonably?
    case 'AWSDate':
      return 'string';
    case 'AWSTime':
      return 'string';
    case 'AWSTimestamp':
      return 'string';
    case 'AWSEmail':
      return 'string';
    case 'AWSJSON':
      throw new Error('AWSJson is not supported');
    default:
      throw new Error(`${graphQlType} is not supported input for tool definitions`);
  }
};
