import { runMigration } from '@aws-amplify/graphql-transformer-migrator';
import * as fs from 'fs-extra';

jest.mock('fs-extra');
const fs_mock = fs as jest.Mocked<typeof fs>;

export type AuthMode = 'apiKey' | 'iam' | 'userPools' | 'oidc';

export const migrateSchema = async (schema: string, authMode: AuthMode = 'apiKey'): Promise<string> => {
  const pathHash = Date.now().toLocaleString().replace(/,/g, '');
  fs_mock.writeFile.mockClear();
  await runMigration([{ schema, filePath: pathHash }], authMode);
  const transformedSchema = fs_mock.writeFile.mock.calls.find(([hash]) => hash === pathHash)?.[1];
  expect(typeof transformedSchema).toBe('string');
  return transformedSchema;
};
