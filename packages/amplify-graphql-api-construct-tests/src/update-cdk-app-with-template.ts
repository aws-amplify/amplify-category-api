import path from 'path';
import { copySync, moveSync } from 'fs-extra';

/**
 * Helper function to update the cdk app code by a given diretory path containing the new `app.ts`
 * @param cwd cdk app project root
 * @param templatePath updated cdk app code directory path. The new `app.ts` should be defined under this directory
 */
export function updateCDKAppWithTemplate(cwd: string, templatePath: string): void {
  const binDir = path.join(cwd, 'bin');
  copySync(templatePath, binDir, { overwrite: true });
  moveSync(path.join(binDir, 'app.ts'), path.join(binDir, `${path.basename(cwd)}.ts`), { overwrite: true });
}
