import path from 'path';
import fs from 'fs-extra';

export const getProjectSchema = (projRoot: string, apiName: string) => {
  const schemaFilePath = path.join(projRoot, 'amplify', 'backend', 'api', apiName, 'schema.graphql');
  return fs.readFileSync(schemaFilePath, 'utf8');
};
