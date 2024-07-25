import * as path from 'path';
import * as fs from 'fs-extra';
import { getMockDataDirectory } from './mock-data-directory';

export function addMockDataToGitIgnore(context) {
  const gitIgnoreFilePath = context.amplify.pathManager.getGitIgnoreFilePath();
  if (fs.existsSync(gitIgnoreFilePath)) {
    const gitRoot = path.dirname(gitIgnoreFilePath);
    const mockDataDirectory = path.relative(gitRoot, getMockDataDirectory(context)).replace(/\\/g, '/');
    let gitIgnoreContent = fs.readFileSync(gitIgnoreFilePath).toString();
    if (gitIgnoreContent.search(RegExp(`^\\s*${mockDataDirectory}\\w*$`, 'gm')) === -1) {
      gitIgnoreContent += '\n' + mockDataDirectory;
      fs.writeFileSync(gitIgnoreFilePath, gitIgnoreContent);
    }
  }
}
