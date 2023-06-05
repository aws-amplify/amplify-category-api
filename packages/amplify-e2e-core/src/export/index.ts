import { nspawn as spawn, getCLIPath } from '..';

/**
 *
 * @param cwd
 * @param settings
 * @param settings.exportPath
 */
export function exportBackend(cwd: string, settings: { exportPath: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['export', '--out', settings.exportPath], { cwd, stripColors: true })
      .wait('For more information: docs.amplify.aws/cli/usage/export-to-cdk')
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

/**
 *
 * @param cwd
 * @param settings
 * @param settings.exportPath
 * @param settings.frontend
 * @param settings.rootStackName
 */
export function exportPullBackend(cwd: string, settings: { exportPath: string; frontend: string; rootStackName: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(
      getCLIPath(),
      ['export', 'pull', '--out', settings.exportPath, '--frontend', settings.frontend, '--rootStackName', settings.rootStackName],
      { cwd, stripColors: true },
    )
      .wait('Successfully generated frontend config files')
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}
