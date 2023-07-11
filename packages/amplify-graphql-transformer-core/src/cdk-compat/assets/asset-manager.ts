import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

class AssetManager {
  public readonly assets;
  public readonly tempAssetDir;

  constructor() {
    this.assets = new Map<string, string>();
    this.tempAssetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transformer-assets'));
  }

  addAsset(fileName: string, contents: string): string {
    this.assets.set(fileName, contents);
    const filePath = path.join(this.tempAssetDir, fileName);
    const fileDirName = path.dirname(filePath);
    if (!fs.existsSync(fileDirName)) {
      fs.mkdirSync(fileDirName, { recursive: true });
    }
    fs.writeFileSync(filePath, contents);
    return filePath;
  }
}

export const assetManager = new AssetManager();
