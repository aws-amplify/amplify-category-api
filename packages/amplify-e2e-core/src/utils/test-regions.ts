import path from 'path';
import fs from 'fs-extra';

type TestRegion = {
  name: string;
  dataAPISupported: boolean;
  optIn: boolean;
};

export const isOptInRegion = (region: string): boolean => {
  const repoRoot = path.join(__dirname, '..', '..', '..', '..');
  const supportedRegionsPath = path.join(repoRoot, 'scripts', 'e2e-test-regions.json');
  const supportedRegions: TestRegion[] = JSON.parse(fs.readFileSync(supportedRegionsPath, 'utf-8'));
  const specificRegion = supportedRegions.find((testRegion) => testRegion.name == region);

  return specificRegion.optIn;
};

export const isDataAPISupported = (region: string): boolean => {
  const repoRoot = path.join(__dirname, '..', '..', '..', '..');
  const supportedRegionsPath = path.join(repoRoot, 'scripts', 'e2e-test-regions.json');
  const supportedRegions: TestRegion[] = JSON.parse(fs.readFileSync(supportedRegionsPath, 'utf-8'));
  const specificRegion = supportedRegions.find((testRegion) => testRegion.name == region);

  return specificRegion.dataAPISupported;
};
