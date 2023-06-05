export interface TransformerFilepathsProvider {
  getBackendDirPath: () => string;
  findProjectRoot: () => string;
  getCurrentCloudBackendDirPath: () => string;
}
