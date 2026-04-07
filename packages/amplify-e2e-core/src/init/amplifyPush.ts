/* eslint-disable import/no-cycle */
/* eslint-disable max-depth */
/* eslint-disable max-lines-per-function */
/* eslint-disable prefer-const */
/* eslint-disable no-param-reassign */
/* eslint-disable no-return-await */
/* eslint-disable consistent-return */
/* eslint-disable no-continue */
/* eslint-disable max-len */
/* eslint-disable spellcheck/spell-checker */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable func-style */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-await-in-loop */
/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { getCLIPath, nspawn as spawn, sleep } from '..';

const pushTimeoutMS = 1000 * 60 * 75; // 75 minutes;

const PUSH_RETRY_BASE_DELAY_MS = 1000 * 30; // 30s base delay (30s, 60s, 120s with exponential backoff)
const PUSH_MAX_RETRIES = 3; // up to 3 retries (4 total attempts)

/**
 * Patterns that indicate transient AWS service errors worth retrying.
 * These include HTML error pages (503/504), throttling, and CFN service limits.
 */
const TRANSIENT_ERROR_PATTERNS = [
  /Unexpected token '<'/i, // HTML error page returned instead of JSON (503/504)
  /<!DOCTYPE/i, // HTML error page content
  /is not valid JSON/i, // JSON parse failure from HTML response
  /ETIMEDOUT/i,
  /ECONNRESET/i,
  /socket hang up/i,
  /Rate exceeded/i,
  /Throttling/i,
  /TooManyRequestsException/i,
  /ServiceUnavailable/i,
  /Internal ?Server ?Error/i,
  /EPIPE/i,
];

const isTransientError = (error: Error): boolean => {
  const message = error.message || '';
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

/**
 * Wraps amplifyPush with retry logic for transient failures.
 * Handles HTML error responses (503/504), CFN throttling, and service limits.
 * Uses exponential backoff: 30s, 60s, 120s between retries.
 */
export async function amplifyPushWithRetry(
  cwd: string,
  testingWithLatestCodebase = false,
  settings?: {
    skipCodegen?: boolean;
    useBetaSqlLayer?: boolean;
  },
): Promise<void> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= PUSH_MAX_RETRIES; attempt++) {
    try {
      await amplifyPush(cwd, testingWithLatestCodebase, settings);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isTransient = isTransientError(lastError);

      // Log full error details for debugging HTML/transient errors
      console.log(`[amplifyPushWithRetry] Attempt ${attempt + 1}/${PUSH_MAX_RETRIES + 1} failed.`);
      console.log(`[amplifyPushWithRetry] Error message: ${lastError.message}`);
      if (lastError.stack) {
        console.log(`[amplifyPushWithRetry] Stack trace: ${lastError.stack}`);
      }
      // Log additional error properties (e.g. AssertionError actual/expected, AWS $response)
      try {
        const errKeys = Object.keys(lastError).filter((k) => !['message', 'stack'].includes(k));
        if (errKeys.length > 0) {
          const extras: Record<string, any> = {};
          for (const key of errKeys) {
            extras[key] = (lastError as any)[key];
          }
          console.log(`[amplifyPushWithRetry] Additional error properties: ${JSON.stringify(extras, null, 2)}`);
        }
      } catch (logErr) {
        console.log(`[amplifyPushWithRetry] Could not serialize error properties: ${logErr}`);
      }
      // Check for AWS SDK raw response — log body and full response
      if ((err as any)?.$response) {
        try {
          console.log(`[amplifyPushWithRetry] Raw $response body: ${JSON.stringify((err as any).$response.body || (err as any).$response, null, 2)}`);
        } catch (logErr) {
          console.log(`[amplifyPushWithRetry] $response present but not serializable: ${logErr}`);
        }
      }
      // Also try the httpResponse path that AWS SDK v3 uses
      if ((err as any)?.$metadata) {
        try {
          console.log(`[amplifyPushWithRetry] Error $metadata: ${JSON.stringify((err as any).$metadata, null, 2)}`);
        } catch (logErr) {
          console.log(`[amplifyPushWithRetry] $metadata present but not serializable: ${logErr}`);
        }
      }
      // Log ALL enumerable and own properties of the error for full diagnostics
      try {
        console.log(`[amplifyPushWithRetry] Full error keys: ${JSON.stringify(Object.keys(err as any))}`);
        console.log(`[amplifyPushWithRetry] Full error JSON: ${JSON.stringify(err, Object.getOwnPropertyNames(err as any), 2)}`);
      } catch (logErr) {
        console.log(`[amplifyPushWithRetry] Could not serialize full error: ${logErr}`);
      }
      // If the error contains HTML content, highlight it for debugging
      if (isTransient && /<!DOCTYPE|<html|<body/i.test(lastError.message)) {
        console.log(`[amplifyPushWithRetry] ⚠️  HTML error page detected in CLI output. Full error body above.`);
      }

      if (attempt < PUSH_MAX_RETRIES) {
        const delayMs = PUSH_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `amplifyPush attempt ${attempt + 1}/${PUSH_MAX_RETRIES + 1} failed${isTransient ? ' (transient error)' : ''}: ${lastError.message}. Retrying in ${delayMs / 1000}s...`,
        );
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

/**
 * Data structure defined for Layer Push
 */
export type LayerPushSettings = {
  acceptSuggestedLayerVersionConfigurations?: boolean;
  layerDescription?: string;
  migrateLegacyLayer?: boolean;
  usePreviousPermissions?: boolean;
};

/**
 * Function to test amplify push with verbose status
 */
export function amplifyPush(
  cwd: string,
  testingWithLatestCodebase = false,
  settings?: {
    skipCodegen?: boolean;
    useBetaSqlLayer?: boolean;
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Test detailed status
    spawn(getCLIPath(testingWithLatestCodebase), ['status', '-v'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait(/.*/)
      .run((err: Error) => {
        if (err) {
          reject(err);
        }
      });
    // Test amplify push
    const pushOptions = ['push'];
    if (settings?.useBetaSqlLayer) {
      pushOptions.push('--use-beta-sql-layer');
    }
    const pushCommands = spawn(getCLIPath(testingWithLatestCodebase), pushOptions, {
      cwd,
      stripColors: true,
      noOutputTimeout: pushTimeoutMS,
    })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes();

    if (!settings?.skipCodegen) {
      pushCommands
        .wait('Do you want to generate code for your newly created GraphQL API')
        .sendConfirmNo()
        .wait('Do you want to generate code for your newly created GraphQL API')
        .sendConfirmNo();
    }

    pushCommands.wait(/.*/).run((err: Error) => {
      if (!err) {
        resolve();
      } else {
        // Log full CLI output for debugging transient HTML errors (503/504)
        console.log(`[amplifyPush] Push failed. Full error message:\n${err.message}`);
        if (/<!DOCTYPE|<html|<body|Unexpected token '<'/i.test(err.message)) {
          console.log(`[amplifyPush] ⚠️  HTML error page detected in CLI output — likely a transient AWS service error (503/504/rate limit).`);
        }
        reject(err);
      }
    });
  });
}

/**
 * Function to test amplify push with codegen for graphql API
 */
export function amplifyPushGraphQlWithCognitoPrompt(cwd: string, testingWithLatestCodebase = false): Promise<void> {
  return new Promise((resolve, reject) => {
    // Test detailed status
    spawn(getCLIPath(testingWithLatestCodebase), ['status', '-v'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait(/.*/)
      .run((err: Error) => {
        if (err) {
          reject(err);
        }
      });
    // Test amplify push
    spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .wait(/.*Do you want to use the default authentication and security configuration.*/)
      .sendCarriageReturn()
      .wait(/.*How do you want users to be able to sign in.*/)
      .sendCarriageReturn()
      .wait(/.*Do you want to configure advanced settings.*/)
      .sendCarriageReturn()
      .wait('Do you want to generate code for your newly created GraphQL API')
      .sendConfirmNo()
      .wait(/.*/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

/**
 * Function to test amplify push with force push flag --force
 */
export function amplifyPushForce(cwd: string, testingWithLatestCodebase = false): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), ['push', '--force'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .wait(/.*/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

/**
 * * Used to stop an iterative deployment
 * * Waits on the table stack to be complete and for the next stack to update in order to cancel the push
 */
export function cancelIterativeAmplifyPush(
  cwd: string,
  idx: { current: number; max: number },
  testingWithLatestCodebase = false,
): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .wait(`Deploying iterative update ${idx.current} of ${idx.max} into`)
      .wait(/.*AWS::AppSync::GraphQLSchema.*UPDATE_IN_PROGRESS.*/)
      .sendCtrlC()
      .run((err: Error, signal) => {
        if (err) {
          if (process.env.CODEBUILD) {
            // In codebuild the code 130 is not sent but with exit code 2
            // This is to catch the error in that scenario so that the test will proceed
            if (!/Killed the process as no output received/.test(err.message)) {
              reject(err);
            }
          } else if (!/Process exited with non zero exit code 130/.test(err.message)) {
            reject(err);
          }
        }
        resolve();
      });
  });
}

/**
 * Function to test amplify push without codegen prompt
 */
export function amplifyPushWithoutCodegen(cwd: string, testingWithLatestCodebase = false, allowDestructiveUpdates = false): Promise<void> {
  const args = ['push'];
  if (allowDestructiveUpdates) {
    args.push('--allow-destructive-graphql-schema-updates');
  }
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), args, { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendCarriageReturn()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

/**
 * Function to test amplify push with function secrets without codegen prompt
 */
export function amplifyPushSecretsWithoutCodegen(cwd: string, testingWithLatestCodebase = false): Promise<void> {
  const args = ['push'];
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), args, { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendCarriageReturn()
      .wait('Secret configuration detected. Do you wish to store new values in the cloud?')
      .sendConfirmYes()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

/**
 * Function to test amplify push with allowDestructiveUpdates flag option
 */
export function amplifyPushUpdate(
  cwd: string,
  waitForText?: RegExp,
  testingWithLatestCodebase = false,
  allowDestructiveUpdates = false,
): Promise<void> {
  const args = ['push'];
  if (allowDestructiveUpdates) {
    args.push('--allow-destructive-graphql-schema-updates');
  }
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), args, { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .wait(waitForText || /.*/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

/**
 * Function to test amplify push
 */
export function amplifyPushAuth(cwd: string, testingWithLatestCodebase = false): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .wait(/.*/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

/**
 * amplify push command for pushing functions
 * @param cwd : current working directory
 * @param testingWithLatestCode : boolean flag
 * @returns void
 */
export const amplifyPushFunction = async (cwd: string, testingWithLatestCode = false): Promise<void> => {
  const chain = spawn(getCLIPath(testingWithLatestCode), ['push', 'function'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
    .wait('Are you sure you want to continue?')
    .sendCarriageReturn();
  return chain.runAsync();
};

/**
 * Function to test amplify push with allowDestructiveUpdates flag and when dependent function is removed from schema.graphql
 */
export function amplifyPushUpdateForDependentModel(
  cwd: string,
  testingWithLatestCodebase = false,
  allowDestructiveUpdates = false,
): Promise<void> {
  const args = ['push'];
  if (allowDestructiveUpdates) {
    args.push('--allow-destructive-graphql-schema-updates');
  }
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), args, { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .wait(/.*/)
      .wait('Do you want to remove the GraphQL model access on these affected functions?')
      .sendConfirmYes()
      .wait(/.*/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

/**
 * Function to test amplify push with iterativeRollback flag option
 */
export function amplifyPushIterativeRollback(cwd: string, testingWithLatestCodebase = false) {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(testingWithLatestCodebase), ['push', '--iterative-rollback'], { cwd, stripColors: true })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .run((err: Error) => {
        if (!err) {
          resolve({});
        } else {
          reject(err);
        }
      });
  });
}

/**
 * Function to test amplify push with destructive updates on the API models
 */
export function amplifyPushDestructiveApiUpdate(cwd: string, includeForce: boolean) {
  return new Promise<void>((resolve, reject) => {
    const args = ['push', '--yes'];
    if (includeForce) {
      args.push('--force');
    }
    const chain = spawn(getCLIPath(), args, { cwd, stripColors: true });
    if (includeForce) {
      chain.run((err) => (err ? reject(err) : resolve()));
    } else {
      chain.wait('If this is intended, rerun the command with').run((err) => (err ? resolve(err) : reject())); // in this case, we expect the CLI to error out
    }
  });
}

/**
 * Function to test amplify push with overrides functionality
 */
export function amplifyPushOverride(cwd: string, testingWithLatestCodebase = false): Promise<void> {
  return new Promise((resolve, reject) => {
    // Test detailed status
    spawn(getCLIPath(testingWithLatestCodebase), ['status', '-v'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait(/.*/)
      .run((err: Error) => {
        if (err) {
          reject(err);
        }
      });
    // Test amplify push
    spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd, stripColors: true, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .wait(/.*/)
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}
