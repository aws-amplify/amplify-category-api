import { nspawn as spawn, getCLIPath } from 'amplify-category-api-e2e-core';

export * from './new-plugin';
export * from './verifyPluginStructure';
/**
 *
 * @param cwd
 */
export function help(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['plugin', 'help'], { cwd, stripColors: true })
      .wait(/.*/)
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
 */
export function scan(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['plugin', 'scan'], { cwd, stripColors: true })
      .wait(/.*/)
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
 */
export function listActive(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['plugin', 'list'], { cwd, stripColors: true })
      .wait('Select the section to list')
      .sendLine('')
      .wait('Select the name of the plugin to list')
      .sendLine('k')
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
 */
export function listExcluded(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['plugin', 'list'], { cwd, stripColors: true })
      .wait('Select the section to list')
      .sendLine('j')
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
 */
export function listGeneralInfo(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['plugin', 'list'], { cwd, stripColors: true })
      .wait('Select the section to list')
      .sendLine('j')
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}
