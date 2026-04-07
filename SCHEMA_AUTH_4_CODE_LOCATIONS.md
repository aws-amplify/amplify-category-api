# Schema Auth 4 - Code Locations and Prompt Expectations

## Primary Test File

### File: `packages/amplify-e2e-tests/src/__tests__/schema-auth-4.test.ts`

**The Hanging Test (lines 92-95):**
```typescript
92:       .wait('Please choose the profile you want to use', waitLog('Please choose the profile you want to use'))
93:       .sendLine(s.profileName)
94:       .wait('Help improve Amplify CLI', waitLog('Help improve Amplify CLI'))  // ← HANGS HERE
95:       .sendYes()
```

**Debug Instrumentation (lines 45-53):**
```typescript
45:   // Enable verbose logging so all CLI output is captured to a file.
46:   // The nexpect runner writes to a temp file when this env var is set.
47:   process.env.VERBOSE_LOGGING_DO_NOT_USE_IN_CI_OR_YOU_WILL_BE_FIRED = '1';
48:
49:   let stepIndex = 0;
50:   const waitLog = (label: string) => (data: string) => {
51:     stepIndex++;
52:     console.log(`${TAG} [${ts()}] Step ${stepIndex} MATCHED: "${label}" | data: ${JSON.stringify(data.substring(0, 200))}`);
53:   };
```

---

## All Files Expecting "Help improve Amplify CLI"

### 1. `packages/amplify-e2e-core/src/init/initProjectHelper.ts`

**Function: `initJSProjectWithProfile()` (lines 93-95)**
```typescript
93:     chain
94:       .wait('Help improve Amplify CLI')
95:       .sendYes()
```

**Function: `initAndroidProjectWithProfile()` (lines 140-142)**
```typescript
140:       .wait('Help improve Amplify CLI')
141:       .sendYes()
142:       .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/)
```

**Function: `initIosProjectWithProfile()` (lines 193-195)**
```typescript
193:       .wait('Help improve Amplify CLI')
194:       .sendYes()
195:       .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/)
```

**Function: `initFlutterProjectWithProfile()` (lines 240-242)**
```typescript
240:       .wait('Help improve Amplify CLI')
241:       .sendYes()
242:       .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/)
```

**Function: `initProjectWithAccessKey()` (lines 307-310)**
```typescript
307:     chain
308:       .wait('Help improve Amplify CLI')
309:       .sendYes()
310:       .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/)
```

### 2. `packages/amplify-e2e-tests/src/init-special-cases/index.ts`

**Function: `initWorkflow()` (lines 92-95)**
```typescript
92:     chain
93:       .wait('Help improve Amplify CLI')
94:       .sendYes()
95:       .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/)
```

### 3. `client-test-apps/js/api-model-relationship-app/src/__tests__/utils/amplifyCLI.ts`

**Location: (exact line numbers not verified, but file contains the prompt)**
```typescript
.wait('Help improve Amplify CLI')
```

---

## The Complete Init Flow Expected by Tests

All these functions follow the same pattern. Here's the complete flow from `initJSProjectWithProfile()`:

```typescript
const chain = spawn(getCLIPath(), cliArgs, {
  cwd,
  stripColors: true,
  env,
  disableCIDetection: s.disableCIDetection,
  noOutputTimeout: 10 * 60 * 1000,
})
  .wait('Do you want to continue with Amplify Gen 1?')           // Step 1
  .sendConfirmYes()
  .wait('Why would you like to use Amplify Gen 1?')              // Step 2
  .sendCarriageReturn()
  .wait('Enter a name for the project')                          // Step 3
  .sendLine(s.name)
  .wait('Initialize the project with the above configuration?')  // Step 4
  .sendConfirmNo()
  .wait('Enter a name for the environment')                      // Step 5
  .sendLine(s.envName)
  .wait('Choose your default editor:')                           // Step 6
  .sendLine(s.editor)
  .wait("Choose the type of app that you're building")           // Step 7
  .sendLine(s.appType)
  .wait('What javascript framework are you using')               // Step 8
  .sendLine(s.framework)
  .wait('Source Directory Path:')                                // Step 9
  .sendLine(s.srcDir)
  .wait('Distribution Directory Path:')                          // Step 10
  .sendLine(s.distDir)
  .wait('Build Command:')                                        // Step 11
  .sendLine(s.buildCmd)
  .wait('Start Command:')                                        // Step 12
  .sendCarriageReturn();

if (!providerConfigSpecified) {
  chain
    .wait('Using default provider  awscloudformation')           // Step 13
    .wait('Select the authentication method you want to use:')   // Step 14
    .sendCarriageReturn()
    .wait('Please choose the profile you want to use')           // Step 15
    .sendLine(s.profileName);
}

chain
  .wait('Help improve Amplify CLI')                              // Step 16 ← HANGS HERE
  .sendYes()
  .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/)  // Step 17
  .run((err: Error) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  });
```

---

## Key Observations

1. **Exact Text Matching**: All tests use exact string matching for "Help improve Amplify CLI"
2. **No Regex Fallback**: Unlike the final completion message (which uses regex), this prompt has no fallback pattern
3. **Consistent Across Functions**: All 5 init functions in initProjectHelper.ts expect the same prompt
4. **Multiple Test Files**: At least 4 different test files depend on this prompt
5. **No Conditional Logic**: The prompt is expected unconditionally after profile selection

---

## Debugging Strategy

To identify what's actually happening:

1. **Enable Verbose Logging**: The test already has instrumentation via `VERBOSE_LOGGING_DO_NOT_USE_IN_CI_OR_YOU_WILL_BE_FIRED`
2. **Check Test Output**: Look for the step-by-step logs showing which prompts matched
3. **Capture Raw CLI Output**: The nexpect library should capture all CLI output
4. **Compare with CLI Source**: Check the Amplify CLI source code for the actual prompt text

---

## Related Files

- **nexpect wrapper**: `packages/amplify-e2e-core/src/utils/nexpect.ts`
- **nexpect reporter**: `packages/amplify-e2e-core/src/nexpect-reporter.js`
- **Test configuration**: `packages/amplify-e2e-tests/src/__tests__/schema-auth-4.test.ts`
- **Init helpers**: `packages/amplify-e2e-core/src/init/initProjectHelper.ts`
