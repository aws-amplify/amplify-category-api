import { nspawn as spawn } from '..';

export function cdkDestroy(cwd: string, option: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    spawn('npx', ['cdk', 'destroy', option], { cwd, stripColors: true })
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
