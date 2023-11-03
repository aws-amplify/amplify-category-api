import path from 'path';
import { copySync, moveSync } from 'fs-extra';

export function updateCDKAppWithTemplate(cwd: string, templatePath: string): void {
  const binDir = path.join(cwd, 'bin');
  copySync(templatePath, binDir, { overwrite: true });
  moveSync(path.join(binDir, 'app.ts'), path.join(binDir, `${path.basename(cwd)}.ts`), { overwrite: true });
}
