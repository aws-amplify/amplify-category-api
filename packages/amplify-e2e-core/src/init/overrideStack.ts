import { nspawn as spawn, getCLIPath } from '..';

export function amplifyOverrideApi(cwd: string, settings: any) {
  const args = ['override', 'api'];
  const chain = spawn(getCLIPath(), args, { cwd, stripColors: true });
  chain.wait('Do you want to edit override.ts file now?').sendNo().sendEof();
  return chain.runAsync();
}

export function buildOverrides(cwd: string, settings: any) {
  const args = ['build'];
  const chain = spawn(getCLIPath(), args, { cwd, stripColors: true });
  return chain.runAsync();
}
