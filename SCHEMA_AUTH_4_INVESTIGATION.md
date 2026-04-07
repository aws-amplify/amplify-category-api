# Schema Auth 4 Init Hang Investigation Report

## Summary
The `schema_auth_4` test hangs at the "Please choose the profile you want to use" prompt. The test is waiting for a "Help improve Amplify CLI" telemetry/analytics consent prompt that should appear AFTER profile selection, but this prompt is not appearing or is appearing with different text.

## Test Location
- **File**: `/home/sarayev/workplace/amplify-category-api/packages/amplify-e2e-tests/src/__tests__/schema-auth-4.test.ts`
- **Function**: `initJSProjectWithProfileDebug()` (lines 25-114)
- **Timeout**: 2 hours (jest.setTimeout(2 * 60 * 60 * 1000))

## Expected Amplify Init Flow

The test expects the following interactive prompts in this order:

1. "Do you want to continue with Amplify Gen 1?" → Yes
2. "Why would you like to use Amplify Gen 1?" → Enter
3. "Enter a name for the project" → EOL
4. "Initialize the project with the above configuration?" → No
5. "Enter a name for the environment" → "integtest"
6. "Choose your default editor:" → EOL
7. "Choose the type of app that you're building" → EOL
8. "What javascript framework are you using" → EOL
9. "Source Directory Path:" → EOL
10. "Distribution Directory Path:" → EOL
11. "Build Command:" → EOL
12. "Start Command:" → Enter
13. "Using default provider  awscloudformation" → (no input)
14. "Select the authentication method you want to use:" → Enter
15. **"Please choose the profile you want to use"** → EOL (profile name)
16. **"Help improve Amplify CLI"** ← **TEST HANGS HERE** → Yes
17. "Try "amplify add api" to create a backend API..." → (completion message, test ends)

## The Hang Point

**Line 92-93 of schema-auth-4.test.ts:**
```typescript
.wait('Please choose the profile you want to use', waitLog('Please choose the profile you want to use'))
.sendLine(s.profileName)
.wait('Help improve Amplify CLI', waitLog('Help improve Amplify CLI'))  // ← HANGS HERE
```

The test successfully matches "Please choose the profile you want to use" and sends the profile name, but then times out waiting for "Help improve Amplify CLI".

## Root Cause Analysis

### Possible Causes:

1. **Prompt Text Changed**: The Amplify CLI may have changed the exact text of the telemetry consent prompt. The test is looking for the exact string "Help improve Amplify CLI" but the CLI might be showing:
   - "Help improve Amplify CLI?" (with question mark)
   - "Help improve the Amplify CLI" (different wording)
   - "Share usage data to help improve Amplify" (completely different text)
   - Some other telemetry/analytics prompt

2. **Prompt Removed**: The telemetry prompt might have been removed entirely from the init flow in a recent CLI update.

3. **Prompt Moved**: The prompt might appear at a different point in the init flow, not immediately after profile selection.

4. **Conditional Prompt**: The prompt might only appear under certain conditions (e.g., first-time setup, specific environment variables, etc.).

5. **CLI Version Mismatch**: The test might be running against a different version of the Amplify CLI than expected.

## Evidence

### All Test Files Using "Help improve Amplify CLI"

The following files all expect this exact prompt text:
- `packages/amplify-e2e-core/src/init/initProjectHelper.ts` (5 functions)
- `packages/amplify-e2e-tests/src/__tests__/schema-auth-4.test.ts`
- `packages/amplify-e2e-tests/src/init-special-cases/index.ts`
- `client-test-apps/js/api-model-relationship-app/src/__tests__/utils/amplifyCLI.ts`

This suggests the prompt is a standard part of the init flow that multiple tests depend on.

### Test Instrumentation

The `schema-auth-4.test.ts` file includes debug logging that captures:
- Timestamp of each prompt match
- Step number
- Matched prompt text
- First 200 characters of data

This instrumentation is enabled via:
```typescript
process.env.VERBOSE_LOGGING_DO_NOT_USE_IN_CI_OR_YOU_WILL_BE_FIRED = '1';
```

## Reproduction Steps

To reproduce the hang locally:

1. Navigate to repo:
   ```bash
   cd /home/sarayev/workplace/amplify-category-api
   ```

2. Create a test directory:
   ```bash
   mkdir -p /tmp/test-amplify-init
   cd /tmp/test-amplify-init
   ```

3. Run amplify init interactively:
   ```bash
   npx amplify init
   ```

4. Follow the prompts and observe what text appears after "Please choose the profile you want to use"

**Note**: Direct execution is blocked by GLIBC compatibility issues on the current system. The Amplify CLI v14.3.0 requires GLIBC 2.27+ but the system has an older version.

## Related Files

### E2E Test Core
- `packages/amplify-e2e-core/src/init/initProjectHelper.ts` - Contains all init helper functions
- `packages/amplify-e2e-core/src/utils/nexpect.ts` - nexpect wrapper for interactive CLI testing
- `packages/amplify-e2e-core/src/nexpect-reporter.js` - Reporter for nexpect execution

### Test Files
- `packages/amplify-e2e-tests/src/__tests__/schema-auth-4.test.ts` - The failing test
- `packages/amplify-e2e-tests/src/__tests__/schema-auth-4b.test.ts` - Related test
- `packages/amplify-e2e-tests/src/__tests__/schema-auth-4c.test.ts` - Related test
- `packages/amplify-e2e-tests/src/init-special-cases/index.ts` - Init special cases

## Next Steps

1. **Check Amplify CLI Release Notes**: Review recent releases of @aws-amplify/cli to see if the telemetry prompt was changed or removed.

2. **Run Test with Debug Output**: Execute the schema-auth-4 test with verbose logging enabled to see exactly what prompts the CLI is showing.

3. **Check CLI Source**: If available, examine the Amplify CLI source code to find the exact prompt text for telemetry consent.

4. **Update Prompt Text**: Once the actual prompt text is identified, update all test files to use the correct text.

5. **Add Fallback Prompts**: Consider adding regex patterns or multiple wait conditions to handle variations in prompt text.

## Environment Information

- **Node Version**: 18.20.8 (via mise)
- **Amplify CLI Version**: 14.3.0 (installed globally)
- **Test Framework**: Jest with nexpect for interactive CLI testing
- **Timeout**: 10 minutes per init operation (noOutputTimeout: 10 * 60 * 1000)
- **System**: Linux with GLIBC compatibility issues (requires 2.27+)

## Related Knowledge

From project memory:
- Amplify CLI is incompatible with Node 24 (should use Node 22 for E2E tests)
- Amplify CLI v13+ requires GLIBC 2.27+ (use v12.x for older systems)
- The CLI's interactive prompts are sensitive to exact text matching via nexpect
