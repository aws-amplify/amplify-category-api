import * as process from 'process';

type DepsClosure = {
  repoDeps: Array<string>;
  registryDeps: Array<string>;
};

/**
 * Search in the packages directory, reading all package.json files to retrieve the package names, mapped to the dependencies they have.
 * @returns a mapping of local packages to their list of runtime dependencies.
 */
const loadRepoPackages = async (): Promise<Record<string, Array<string>>> => {
  return {};
};

/**
 * Given a set of input deps, compute the full closure of local and remote deps.
 *
 * Assumption: repoDeps will depend on registryDeps, but the inverse should not hold true.
 * Reasoning: If this were the case, our release process is already not sufficient to ensure a single version
 * of our package is included in the final bundled result.
 * @param param0 the input deps
 * @param param0.repoDeps the deps that exist within this repo to verify.
 * @param param0.registryDeps the deps that do not exist within this repo to verify.
 * @returns the full set of registry and repo deps.
 */
const computeDepsClosure = async ({ repoDeps, registryDeps }: DepsClosure): Promise<DepsClosure> => {
  const repoPackageClosures = await loadRepoPackages();
  console.log(`Found Repo Package Closures: ${JSON.stringify(repoPackageClosures, null, 2)}`);
  const repoPackages = Object.keys(repoPackageClosures);
  console.log(`Found Repo Packages: ${JSON.stringify(repoPackages, null, 2)}`);
  return {
    repoDeps,
    registryDeps,
  };
};

/**
 * Main entry point, this will invoke the following steps.
 * 1. Compute the full closure of deps.
 * 2. Ensure that a scoped nohoist is set on our root package.json for all of these libraries.
 * 3. Ensure that the cdk construct package.json's dependencies include all of these libraries.
 * 3. Ensure that the cdk construct package.json's bundledDependencies include all of these libraries.
 */
const main = async (): Promise<void> => {
  try {
    const fullDepsClosure = await computeDepsClosure({
      repoDeps: [
        '@aws-amplify/graphql-transformer',
        '@aws-amplify/graphql-transformer-core',
        '@aws-amplify/graphql-transformer-interfaces',
      ],
      registryDeps: ['zod'],
    });
    console.log(`Computed Full Deps Closure: ${JSON.stringify(fullDepsClosure, null, 2)}`);
    process.exit(0);
  } catch (e) {
    console.error('Caught exception while computing deps closure.', e);
    process.exit(1);
  }
};

void main();
