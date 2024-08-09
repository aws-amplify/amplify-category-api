import * as path from 'path';
import * as fs from 'fs-extra';

export const writeOverrides = (overrides: string, projRoot: string): void => {
  const filePath = path.join(projRoot, 'bin', 'overrides.ts');
  fs.writeFileSync(filePath, overrides);
  console.log(`Wrote overrides to ${filePath}`);
};
