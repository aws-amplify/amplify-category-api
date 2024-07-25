import * as path from 'path';
import * as fs from 'fs-extra';
import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';

const configTemplatePath = path.join(__dirname, 'api-extractor.json');

const extractApi = (packagePath: string): void => {
  const hasTypeScript = fs.pathExistsSync(path.join(packagePath, 'tsconfig.json'));
  const hasEntryPoint = fs.pathExistsSync(path.join(packagePath, 'lib', 'index.js'));
  const pkgConfigPath = path.join(packagePath, 'api-extractor.json');
  const hasApiExtractorFile = fs.pathExistsSync(pkgConfigPath);

  if (!hasTypeScript || !(hasEntryPoint || hasApiExtractorFile)) {
    console.log(`Skipping ${packagePath}`);
    return;
  }
  console.log(`Extracting ${packagePath}`);

  if (!hasApiExtractorFile) {
    fs.copySync(configTemplatePath, pkgConfigPath);
  }
  try {
    const extractorConfig = ExtractorConfig.loadFileAndPrepare(pkgConfigPath);
    Extractor.invoke(extractorConfig, {
      localBuild: true,
      showVerboseMessages: false,
    });
  } finally {
    const tmpPath = path.join(packagePath, 'temp');
    if (fs.pathExistsSync(tmpPath)) {
      fs.removeSync(tmpPath);
    }
    if (!hasApiExtractorFile) {
      fs.removeSync(pkgConfigPath);
    }
  }
};

extractApi(process.cwd());
