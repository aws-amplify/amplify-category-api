import { processRequest } from '@aws-amplify/graphql-query-processor';

// To test this method with the local version of the '@aws-amplify/graphql-query-processor' package, add the following line to the package.json file:
//      "@aws-amplify/graphql-query-processor": "../../amplify-graphql-query-processor"
// The above line must be removed from the package.json file before publishing the package.

export const run = async (event) => {
  const response = await processRequest(event);
  console.log(response); // For debugging purposes.
  return response;
};
