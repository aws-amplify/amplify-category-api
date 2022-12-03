/**
 * Resolves the AWS region to run the tests
 * @param defaultRegion 
 * @returns 
 */
export const resolveTestRegion = (defaultRegion = 'us-west-2') => {
  const resolvedRegion = process?.env?.CLI_REGION || defaultRegion;
  console.log('Running in region: ' + resolvedRegion);
  return resolvedRegion;
}