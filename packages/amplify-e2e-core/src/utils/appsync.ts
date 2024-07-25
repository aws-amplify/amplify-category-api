import fs from 'fs-extra';
import path from 'path';

export const getProjectSchema = (projRoot: string, apiName: string) => {
  const schemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.graphql');
  return fs.readFileSync(schemaFilePath, 'utf8');
};
