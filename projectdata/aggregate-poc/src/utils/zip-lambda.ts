/* eslint-disable spellcheck/spell-checker */
import * as path from 'path';
import * as JSZip from 'jszip';
import * as fs from 'fs';

/**
 * Zip up a lambda folder, and return the path to the zip file.
 */
export const zipLambdas = async (): Promise<void> => {
  const lambdaResourcesDirectory = path.join(__dirname, '..', '..', 'resources', 'lambda');

  const folderNames = fs.readdirSync(lambdaResourcesDirectory).filter(name => name !== '.DS_Store' && !name.match(/\.lambda\.zip/));

  const zipPromises = folderNames.map(lambdaName => {
    const lambdaDirectory = path.join(lambdaResourcesDirectory, lambdaName);
    const zipPath = path.join(lambdaResourcesDirectory, `${lambdaName}.lambda.zip`);

    const zip = new JSZip();

    fs.readdirSync(lambdaDirectory).forEach((fileName: string) => {
      const fileContents = fs.readFileSync(path.join(lambdaDirectory, fileName));
      zip.file(fileName, fileContents);
    });

    return new Promise(resolve => {
      zip
        .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
        .pipe(fs.createWriteStream(zipPath))
        .on('finish', () => resolve(zipPath));
    });
  });

  await Promise.all(zipPromises);
};
