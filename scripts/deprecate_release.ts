import { GitClient } from './components/git_client';
import { NpmClient, loadNpmTokenFromEnvVar } from './components/npm_client';
import { ReleaseDeprecator } from './components/release_deprecator';
import { DistTagMover } from './components/dist_tag_mover';

(async () => {
  const deprecationMessage = process.env.DEPRECATION_MESSAGE;
  if (!deprecationMessage) {
    throw new Error('DEPRECATION_MESSAGE not set.');
  }
  const searchForReleaseStartingFrom = process.env.SEARCH_FOR_RELEASE_STARTING_FROM;
  if (!searchForReleaseStartingFrom) {
    throw new Error('SEARCH_FOR_RELEASE_STARTING_FROM not set.');
  }
  const useNpmRegistry = process.env.USE_NPM_REGISTRY === 'true';

  if (useNpmRegistry) {
    console.log('useNpmRegistry is TRUE. This run will update package metadata on the public npm package registry.');
  } else {
    console.log('useNpmRegistry is FALSE. This run will update package metadata on a local npm proxy. No public changes will be made.');
    await import('./start_npm_proxy');
  }

  const npmClient = new NpmClient(useNpmRegistry ? loadNpmTokenFromEnvVar() : null);

  await npmClient.configureNpmRc();

  const releaseDeprecator = new ReleaseDeprecator(
    searchForReleaseStartingFrom,
    deprecationMessage,
    new GitClient(),
    npmClient,
    new DistTagMover(npmClient),
  );

  try {
    await releaseDeprecator.deprecateRelease();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
