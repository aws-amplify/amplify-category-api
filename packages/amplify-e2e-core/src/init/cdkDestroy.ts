import { nspawn as spawn, getNpxPath } from '..';

/**
 *
 * @param cwd
 * @param option
 */
export function cdkDestroy(cwd: string, option: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    spawn(getNpxPath(), ['cdk', 'destroy', option], { cwd, stripColors: true })
      .sendConfirmYes()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}
