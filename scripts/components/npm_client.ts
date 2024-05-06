const execa = require('execa');
import { writeFile } from 'fs/promises';
import { EOL } from 'os';
import * as path from 'path';

/**
 * Type for the response of `npm show <package> --json`
 * We can add to this as we need to access additional config in a type-safe way
 */
export type PackageInfo = {
  // we have to match the output payload of npm show
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'dist-tags': Record<string, string>;
  deprecated?: string;
};

/**
 * Client for programmatically interacting with the local npm cli.
 *
 * Note that this class is not guaranteed to be a singleton so it should not store any mutable internal state
 */
export class NpmClient {
  /**
   * execaCommand that allows us to capture stdout
   */
  private readonly exec;

  /**
   * execaCommand that pipes buffers to process buffers
   */
  private readonly execWithIO;

  /**
   * Initialize the npm client with an optional directory to operate in.
   *
   * By default the client operates in the process cwd
   */
  constructor(private readonly cwd: string = process.cwd()) {
    this.exec = (command: string, args: string[]) => execa.sync(command, args, { cwd });
    this.execWithIO = (command: string, args: string[]) => execa.sync(command, args, { cwd, stdio: 'inherit' });
  }

  deprecatePackage = async (packageVersionSpecifier: string, deprecationMessage: string) => {
    await this.execWithIO('npm', ['deprecate', packageVersionSpecifier, deprecationMessage]);
  };

  unDeprecatePackage = async (packageVersionSpecifier: string) => {
    // explicitly specifying an empty deprecation message is the official way to "un-deprecate" a package
    // see https://docs.npmjs.com/cli/v8/commands/npm-deprecate
    await this.execWithIO('npm', ['deprecate', packageVersionSpecifier, '']);
  };

  setDistTag = async (packageVersionSpecifier: string, distTag: string) => {
    await this.execWithIO('npm', ['dist-tag', 'add', packageVersionSpecifier, distTag]);
  };

  getPackageInfo = async (packageVersionSpecifier: string) => {
    const { stdout: jsonString } = await this.exec('npm', ['show', packageVersionSpecifier, '--json']);
    return JSON.parse(jsonString) as PackageInfo;
  };

  init = async () => {
    await this.execWithIO('npm', ['init', '--yes']);
  };

  initWorkspacePackage = async (packageName: string) => {
    await this.execWithIO('npm', ['init', '--workspace', `packages/${packageName}`, '--yes']);
  };

  install = async (packageSpecifiers: string[], options: { dev: boolean } = { dev: false }) => {
    await this.execWithIO('npm', ['install', `${options.dev ? '-D' : ''}`, ...packageSpecifiers]);
  };
}
