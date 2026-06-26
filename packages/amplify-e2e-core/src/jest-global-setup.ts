import { ensureGen1PlaceholderApp } from './init/ensureGen1PlaceholderApp';

/**
 * Jest `globalSetup` hook. Runs exactly once per jest invocation (i.e. once per
 * e2e shard) before any test file executes or any `amplify init` runs, ensuring
 * the Gen1 deprecation-bypass placeholder app exists in the shard's region
 * (`process.env.CLI_REGION`). Best-effort and idempotent — never throws.
 */
export default async function globalSetup(): Promise<void> {
  await ensureGen1PlaceholderApp(process.env.CLI_REGION);
}
