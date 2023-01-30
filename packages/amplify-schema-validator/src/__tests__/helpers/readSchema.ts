/**
 * Basic help to reduce duplication in test files
 */
import fs from 'fs';
import path from 'path';

const schemaDir = path.join(__dirname, '..', 'schemas');
export const readSchema = (schemaName: string): string => fs.readFileSync(path.join(schemaDir, schemaName)).toString();
