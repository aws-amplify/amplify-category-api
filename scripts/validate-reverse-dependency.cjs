/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable func-style */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
// For testing, this repository installs `@aws-amplify/cli-internal`, which in
// turn depends on @aws-amplify/amplify-category-api (and other packages) which
// are being produced here.
//
// When testing, we should make sure that we are using the local packages and
// not installing fresh copies from the Internet.
//
// This script makes sure that we didn't accidentally install internet copies of
// any of the packages being produced in this repo into `node_modules`.
const fs = require('fs/promises');
const path = require('path');

async function main() {
  const packageRoot = path.resolve('packages');

  const dirs = await fs.readdir(packageRoot);
  const packageJsons = await Promise.all(dirs.map(async (dir) => JSON.parse(await fs.readFile(path.join(packageRoot, dir, 'package.json')))));
  const packageNames = packageJsons.map((packageJson) => packageJson.name);

  const locations = packageNames.map((packageName) => ({
    packageName,
    foundLocation: require.resolve(`${packageName}/package.json`, {
      paths: [path.join('node_modules', '@aws-amplify', 'cli-internal', 'index.js')]
    }),
  }));

  const outsidePackageRoot = locations.filter(({ foundLocation }) => !foundLocation.startsWith(packageRoot));

  if (outsidePackageRoot.length > 0) {
    console.log('❌ Some dependencies of @aws-amplify/cli-internal resolve to versions downloaded from the Internet, rather than produced here:');
    for (const { packageName, foundLocation } of outsidePackageRoot) {
      console.log(`  ${packageName} -> ${foundLocation}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`✅ All @aws-amplify/cli-internal dependencies are symlinked to the ${packageRoot} directory`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});