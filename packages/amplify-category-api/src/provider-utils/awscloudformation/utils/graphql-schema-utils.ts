import * as fs from 'fs-extra';

export const writeSchemaFile = (pathToSchemaFile: string, schemaString: string) => {
  fs.ensureFileSync(pathToSchemaFile);
  fs.writeFileSync(pathToSchemaFile, schemaString);
};
