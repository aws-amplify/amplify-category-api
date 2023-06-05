import { getBackendAmplifyMeta } from './projectMeta';

/**
 *
 * @param projRoot
 */
export function getAppId(projRoot: string): string {
  const meta = getBackendAmplifyMeta(projRoot);
  return meta.providers.awscloudformation.AmplifyAppId;
}
