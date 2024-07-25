import * as lockfile from '@yarnpkg/lockfile';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';

type DepsClosure = {
  repoDeps: Array<string>;
  registryDeps: Array<string>;
};

type ConstructPackageConfiguration = {
  packageName: string;
  packageDir: string;
};

const CONSTRUCT_PACKAGE_CONFIGURATIONS: ConstructPackageConfiguration[] = [
  {
    packageName: '@aws-amplify/graphql-api-construct',
    packageDir: 'amplify-graphql-api-construct',
  },
  {
    packageName: '@aws-amplify/data-construct',
    packageDir: 'amplify-data-construct',
  },
];

const PACKAGES_DIR = 'packages';
const NON_JSII_DEPENDENCIES_FILENAME = 'nonJsiiDependencies.json';
const PACKAGE_JSON_FILENAME = 'package.json';

/**
 * Return whether or not a given package directory name is a code package in the monorepo, we check if it's a directory, and has
 * a package.json file.
 * @param subDirectory the local path to check.
 * @returns true if this appears to be a package directory
 */
const isPackageDirectory = (subDirectory: string): boolean => {
  const packageDir = path.join(PACKAGES_DIR, subDirectory);
  return fs.lstatSync(packageDir).isDirectory() && fs.existsSync(path.join(packageDir, PACKAGE_JSON_FILENAME));
};

/**
 * Return a tuple of string to list of string for a given package name
 * @param subDirectory the subDirectoy to pull dependencies for
 * @returns a tuple of the package name to list of dependency names
 */
const getPackageDependencies = (subDirectory: string): [string, Array<string>] => {
  const packageJsonContents = fs.readFileSync(path.join(PACKAGES_DIR, subDirectory, PACKAGE_JSON_FILENAME), 'utf-8');
  const packageJson = JSON.parse(packageJsonContents);
  return [
    `${packageJson.name}@${packageJson.version}`,
    packageJson.dependencies
      ? Object.entries(packageJson.dependencies).map(([packageName, semverPattern]) => `${packageName}@${semverPattern}`)
      : [],
  ];
};

/**
 * Search in the packages directory, reading all package.json files to retrieve the package names, mapped to the dependencies they have.
 * @returns a mapping of local packages to their list of runtime dependencies.
 */
const getRepoPackages = (): Record<string, Array<string>> =>
  Object.fromEntries(fs.readdirSync(PACKAGES_DIR).filter(isPackageDirectory).map(getPackageDependencies));

/**
 * Given a set of input deps, compute the full closure of local and remote deps.
 *
 * Assumption: repoDeps will depend on registryDeps, but the inverse should not hold true.
 * Reasoning: If this were the case, our release process is already not sufficient to ensure a single version
 * of our package is included in the final bundled result.
 * @param deps the input deps
 * @returns the full set of registry and repo deps.
 */
const computeDepsClosure = (deps: string[]): DepsClosure => {
  const repoPackageClosures = getRepoPackages();
  const repoPackages = new Set(Object.keys(repoPackageClosures));

  const lockfileContents = lockfile.parse(fs.readFileSync('yarn.lock', 'utf8')).object;

  const repoDepClosure = new Set<string>();
  const registryDepClosure = new Set<string>();
  const seenDeps = new Set<string>();
  let currDeps: string[] = [...deps];
  do {
    const stageDeps: string[] = [];
    currDeps.forEach((currDep: string) => {
      if (seenDeps.has(currDep)) return;
      seenDeps.add(currDep);
      if (repoPackages.has(currDep)) {
        repoDepClosure.add(currDep);
        stageDeps.push(...repoPackageClosures[currDep]);
      } else {
        registryDepClosure.add(currDep);
        const lockfileDeps = lockfileContents[currDep].dependencies ?? {};
        const lockfileDepsList = Object.entries(lockfileDeps).map(([packageName, semverPattern]) => `${packageName}@${semverPattern}`);
        stageDeps.push(...lockfileDepsList);
      }
    });
    currDeps = stageDeps;
  } while (currDeps.length > 0);

  return {
    repoDeps: Array.from(repoDepClosure),
    registryDeps: Array.from(registryDepClosure),
  };
};

/**
 * Remove semver portion from package descriptor
 * e.g. zod@^3.1.12 => zod, or @aws-amplify/graphql-transformer@1.1.2 => @aws-amplify/graphql-transformer.
 * @param vals values which we're going to remove semver string segments
 * @returns the values without semver string segments
 */
const stripSemverString = (vals: string[]): string[] => vals.map((val: string) => val.split('@').slice(0, -1).join('@'));

/**
 * Return the package.json file for the cdk construct.
 * @returns the package.json file for the cdk construct.
 */
const getCdkConstructPackageJson = (contructPackageDir: string): any =>
  JSON.parse(fs.readFileSync(path.join(PACKAGES_DIR, contructPackageDir, PACKAGE_JSON_FILENAME), 'utf-8'));

/**
 * Return the package.json file for the monorepo root.
 * @returns the package.json file for the monorepo root.
 */
const getRootPackageJson = (): any => JSON.parse(fs.readFileSync(PACKAGE_JSON_FILENAME, 'utf-8'));

/**
 * Read the current versions of these packages from the package.json file for the cdk construct.
 * @returns the deps decorate with current versions
 */
const attachCurrentVersions = (constructPackageDir: string, deps: string[]): string[] => {
  const trackedDeps = new Set(deps);
  return Object.entries(getCdkConstructPackageJson(constructPackageDir).dependencies)
    .filter(([packageName]) => trackedDeps.has(packageName))
    .map(([packageName, packageSemver]) => `${packageName}@${packageSemver}`);
};

/**
 * Validate that there is a package scoped nohoist for each dependency required.
 */
const validateNohoistsAreConfigured = (constructPackageName: string, deps: string[]): string[] => {
  const nohoistValues = new Set(getRootPackageJson().workspaces.nohoist);
  return deps
    .map((depName) => `${constructPackageName}/${depName}`)
    .filter((depPath) => !nohoistValues.has(depPath))
    .map((depPath) => `${depPath} not found in root package.json nohoist config`);
};

/**
 * Validate that there is a runtime dependency in the construct for each dependency required.
 */
const validateConstructDependenciesAreConfigured = (constructPackageDir: string, deps: string[]): string[] => {
  const dependencyKeys = new Set(Object.keys(getCdkConstructPackageJson(constructPackageDir).dependencies));
  return deps
    .filter((depName) => !dependencyKeys.has(depName))
    .map((depName) => `${depName} not found in construct dependencies in ${constructPackageDir}`);
};

/**
 * Deps don't seem to bundle when they're also in devDependencies, validate none of those exist.
 * @returns a list of warning strings for incorrectly included devDependencies
 */
const validateConstructDevDependenciesAreConfigured = (constructPackageDir: string, deps: string[]): string[] => {
  const devDependencyKeys = new Set(Object.keys(getCdkConstructPackageJson(constructPackageDir).devDependencies));
  return deps
    .filter((depName) => devDependencyKeys.has(depName))
    .map((depName) => `${depName} found in construct devDependencies in ${constructPackageDir}`);
};

/**
 * Validate that there is a bundled dependency in the construct for each dependency required.
 */
const validateConstructBundledDependenciesAreConfigured = (constructPackageDir: string, deps: string[]): string[] => {
  const dependencyKeys = new Set(getCdkConstructPackageJson(constructPackageDir).bundledDependencies);
  return deps
    .filter((depName) => !dependencyKeys.has(depName))
    .map((depName) => `${depName} not found in construct bundledDependencies in ${constructPackageDir}`);
};

/**
 * Main entry point, this will invoke the following steps.
 * FYI: This is pretty silly, but I think we need to feed the versions BACK form the construct package.json in order for
 * lerna versioning to keep from blowing us up.
 * 1. Compute the full closure of deps.
 * 2. Ensure that a scoped nohoist is set on our root package.json for all of these libraries.
 * 3. Ensure that the cdk construct package.json's dependencies include all of these libraries.
 * 3. Ensure that the cdk construct package.json's bundledDependencies include all of these libraries.
 */
const main = (): void => {
  try {
    const validationErrors: string[] = [];
    CONSTRUCT_PACKAGE_CONFIGURATIONS.forEach(({ packageName, packageDir }) => {
      const nonJsiiDeps = JSON.parse(fs.readFileSync(path.join(PACKAGES_DIR, packageDir, NON_JSII_DEPENDENCIES_FILENAME), 'utf-8'));
      const fullDepsClosure = computeDepsClosure(attachCurrentVersions(packageDir, nonJsiiDeps));
      const dedupedDepListWithoutSemver: string[] = Array.from(
        new Set([...stripSemverString(fullDepsClosure.repoDeps), ...stripSemverString(fullDepsClosure.registryDeps)]),
      );
      validationErrors.push(
        ...validateNohoistsAreConfigured(packageName, dedupedDepListWithoutSemver),
        ...validateConstructDependenciesAreConfigured(packageDir, dedupedDepListWithoutSemver),
        ...validateConstructBundledDependenciesAreConfigured(packageDir, dedupedDepListWithoutSemver),
        ...validateConstructDevDependenciesAreConfigured(packageDir, dedupedDepListWithoutSemver),
      );
    });

    if (validationErrors.length > 0) {
      console.error(`Caught Validation Errors: ${validationErrors.join('\n')}`);
      process.exit(1);
    }
    console.log('Validated nohoist, package dependencies, and package bundled depencies were configured correctly.');
    process.exit(0);
  } catch (e) {
    console.error('Caught exception while computing deps closure.', e);
    process.exit(1);
  }
};

main();
