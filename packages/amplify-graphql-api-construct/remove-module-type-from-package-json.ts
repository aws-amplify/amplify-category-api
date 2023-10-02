import * as fs from 'fs';
import * as path from 'path';

/**
 * This script is used as part of the build process for the package when transforming some esm dependencies to cjs compatible packages
 * It removes the "type" field from a package.json file so that node will use the cjs module loader rather than esm
 */

const packagePath = process.argv[2];
if (!packagePath) {
  throw new Error('A path must be specified as the first and only arg to the script');
}

const packageJsonPath = path.join(packagePath, 'package.json');

const packageJsonObj = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
delete packageJsonObj.type;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonObj, null, 2));
console.log(`removed "type" field from ${packageJsonPath}`);
