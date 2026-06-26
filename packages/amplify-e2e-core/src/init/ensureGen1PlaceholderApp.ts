import {
  AmplifyClient,
  ListAppsCommand,
  CreateAppCommand,
  ListBackendEnvironmentsCommand,
  CreateBackendEnvironmentCommand,
} from '@aws-sdk/client-amplify';

/**
 * Name of the placeholder Amplify Gen1 app that, when present in an account +
 * region, bypasses the Gen1 end-of-life gate during `amplify init`.
 */
export const GEN1_PLACEHOLDER_APP_NAME = 'DoNotDeleteAppToBypassGen1Deprecation';

/**
 * Backend environment name required on the placeholder app for the bypass to
 * take effect.
 */
export const GEN1_PLACEHOLDER_BACKEND_ENV_NAME = 'test';

const LIST_APPS_PAGE_SIZE = 100;

/**
 * Ensures the Gen1 deprecation-bypass placeholder app (and its `test` backend
 * environment) exists in the given region so the Gen1 EOL gate never blocks
 * `amplify init` during e2e runs, self-healing any prior cleanup deletion.
 *
 * Idempotent: the app and backend environment are created only when missing.
 * Never throws — all failures are logged and swallowed so an already-healthy
 * run is never broken by this best-effort setup step. Relies on the ambient
 * e2e credentials picked up by the AWS SDK default provider chain.
 *
 * @param region target AWS region; defaults to `process.env.CLI_REGION`.
 */
export async function ensureGen1PlaceholderApp(region: string = process.env.CLI_REGION): Promise<void> {
  if (!region) {
    console.log('⚠️ ensureGen1PlaceholderApp: no region provided (CLI_REGION unset); skipping');
    return;
  }

  try {
    const client = new AmplifyClient({ region });

    let appId: string | undefined;
    let nextToken: string | undefined;
    do {
      const { apps, nextToken: token } = await client.send(new ListAppsCommand({ maxResults: LIST_APPS_PAGE_SIZE, nextToken }));
      const existing = (apps ?? []).find((app) => app.name === GEN1_PLACEHOLDER_APP_NAME);
      if (existing) {
        appId = existing.appId;
        break;
      }
      nextToken = token;
    } while (nextToken);

    if (!appId) {
      const { app } = await client.send(new CreateAppCommand({ name: GEN1_PLACEHOLDER_APP_NAME }));
      appId = app?.appId;
      console.log(`✅ ensureGen1PlaceholderApp: created placeholder app '${GEN1_PLACEHOLDER_APP_NAME}' (${appId}) in ${region}`);
    }

    if (!appId) {
      console.log(`⚠️ ensureGen1PlaceholderApp: could not resolve placeholder appId in ${region}; skipping backend env`);
      return;
    }

    const { backendEnvironments } = await client.send(new ListBackendEnvironmentsCommand({ appId }));
    const hasEnv = (backendEnvironments ?? []).some((env) => env.environmentName === GEN1_PLACEHOLDER_BACKEND_ENV_NAME);
    if (!hasEnv) {
      await client.send(new CreateBackendEnvironmentCommand({ appId, environmentName: GEN1_PLACEHOLDER_BACKEND_ENV_NAME }));
      console.log(
        `✅ ensureGen1PlaceholderApp: created backend env '${GEN1_PLACEHOLDER_BACKEND_ENV_NAME}' for placeholder app in ${region}`,
      );
    }
  } catch (err) {
    console.log(`⚠️ ensureGen1PlaceholderApp: best-effort setup failed in ${region} (continuing): ${err?.message ?? err}`);
  }
}
