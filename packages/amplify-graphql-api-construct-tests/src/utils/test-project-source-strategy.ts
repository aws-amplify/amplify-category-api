import * as fs from 'node:fs';
import * as path from 'node:path';

export type TestProjectSourceStrategy =
  | TestProjectSourceCreateAndDestroy
  | TestProjectSourceCreateAndRetain
  | TestProjectSourceReuseExisting;
/** A TestProjectSource strategy for creating a new project and destroying it after the run is complete */

export interface TestProjectSourceCreateAndDestroy {
  type: 'create-and-destroy';
  retain: false;
}
/** A TestProjectSource strategy for creating a new project and retaining it after the run is complete */

export interface TestProjectSourceCreateAndRetain {
  type: 'create-and-retain';
  retain: true;
}
/** A TestProjectSource strategy for reusing an existing project. */

export interface TestProjectSourceReuseExisting {
  type: 'reuse-existing';

  /** The name of the project, as stored in the package.json of the project */
  projName: string;

  /** The path at which the test project is stored. Contains the CDK project, db-details, and stack config */
  projRoot: string;

  /** If true, retain the project. If false, destroy the CDK project and local project directory. */
  retain: boolean;
}

/**
 * Gets an existing test project strategy path for the specified `token` (usually the project folder name stub or similar).
 */
export const getTestProjectSourceStrategyPath = (token: string): string => {
  return path.resolve(path.join(__dirname, '..', '..', `${token}-test-strategy.json`));
};

/**
 * Gets an existing test project strategy for the specified `token` (usually the project folder name stub or similar). If the file does not
 * exist, returns a {@link TestProjectSourceCreateAndDestroy} strategy.
 */
export const getTestProjectSourceStrategy = (token: string): TestProjectSourceStrategy => {
  const projSourceStrategyPath = getTestProjectSourceStrategyPath(token);
  if (!fs.existsSync(projSourceStrategyPath)) {
    return {
      type: 'create-and-destroy',
      retain: false,
    };
  }

  const projSourceStrategy = JSON.parse(fs.readFileSync(projSourceStrategyPath, 'utf8'));
  return projSourceStrategy as TestProjectSourceStrategy;
};
