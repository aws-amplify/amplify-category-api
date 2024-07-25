import { DistTagMover } from './components/dist_tag_mover';
import { GitClient } from './components/git_client';
import { NpmClient } from './components/npm_client';
import { ReleaseDeprecator } from './components/release_deprecator';

(async () => {
  const deprecationMessage = process.env.DEPRECATION_MESSAGE;
  if (!deprecationMessage) {
    throw new Error('DEPRECATION_MESSAGE not set.');
  }
  const searchForReleaseStartingFrom = process.env.SEARCH_FOR_RELEASE_STARTING_FROM;
  if (!searchForReleaseStartingFrom) {
    throw new Error('SEARCH_FOR_RELEASE_STARTING_FROM not set.');
  }

  const npmClient = new NpmClient();

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
