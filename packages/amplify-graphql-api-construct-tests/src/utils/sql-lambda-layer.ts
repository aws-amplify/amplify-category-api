import fetch from 'node-fetch';

/**
 * Retrieves the Beta version of the SQL Lambda layer for a particular region, for use in integration/E2E tests
 */
export const fetchSqlBetaLayerArn = async (region: string): Promise<string> => {
  const bucket = 'amplify-rds-layer-resources-beta';
  const url = `https://${bucket}.s3.amazonaws.com/sql-layer-versions/${region}`;
  const response = await fetch(url);
  if (response.status === 200) {
    const result = await response.text();
    return result;
  } else {
    throw new Error(`Unable to Beta SQL layer ARN from ${url} with status code ${response.status}.`);
  }
};
