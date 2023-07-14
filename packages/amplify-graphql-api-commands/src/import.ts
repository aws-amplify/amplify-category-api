import * as fs from 'fs';
import { generateRDSSchema } from '@aws-amplify/graphql-schema-generator';
import { RDSConnectionSecrets, ImportedRDSType } from '@aws-amplify/graphql-transformer-core';

const generateSecretValuesFromSecretStore = async (secretStorePrefix: string): Promise<RDSConnectionSecrets> => {
  return {
    host: 'localhost',
    port: 3306,
    database: 'test',
    username: 'XXXX',
    password: 'XXXX',
    secretStoreArn: secretStorePrefix,
  };
};

export const importRDSSchema = async (secretStorePrefix: string, outPath: string): Promise<void> => {
  const secretValues = await generateSecretValuesFromSecretStore(secretStorePrefix);
  const generatedSchema = await generateRDSSchema({
    engine: ImportedRDSType.MYSQL,
    ...secretValues,
  });
  fs.writeFileSync(outPath, generatedSchema);
};
