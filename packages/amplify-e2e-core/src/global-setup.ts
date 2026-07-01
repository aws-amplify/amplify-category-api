import { ensureGen1PlaceholderApp } from './init/initProjectHelper';

/**
 * Jest `globalSetup` hook. Runs once per shard (jest process) before any test files.
 *
 * Ensures the Gen1 deprecation-bypass placeholder app exists in the shard's region
 * (`process.env.CLI_REGION`) so that `amplify init` is not blocked. Self-healing and
 * idempotent — recreates the placeholder if cleanup deleted it. Never throws.
 */
export default async function globalSetup(): Promise<void> {
  await ensureGen1PlaceholderApp(process.env.CLI_REGION);
}
