// The contents of this file were taken from the AWS CDK provider framework.
// https://github.com/aws/aws-cdk/blob/c52ff08cfd1515d35feb93bcba34a3231a94985c/packages/aws-cdk-lib/custom-resources/lib/provider-framework/runtime/util.ts

/* eslint-disable arrow-parens */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-console */
/* eslint-disable prefer-const */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable func-style */

export const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`The environment variable "${name}" is not defined -- this shouldn't happen.
      Please open an issue at github.com/aws-amplify/amplify-category-api`);
  }
  return value;
};

export interface RetryOptions {
  /** How many retries (will at least try once) */
  readonly attempts: number;
  /** Sleep base, in ms */
  readonly sleep: number;
}

export function withRetries<A extends Array<any>, B>(options: RetryOptions, fn: (...xs: A) => Promise<B>): (...xs: A) => Promise<B> {
  return async (...xs: A) => {
    let attempts = options.attempts;
    let ms = options.sleep;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn(...xs);
      } catch (e) {
        if (attempts-- <= 0) {
          throw e;
        }
        await sleep(Math.floor(Math.random() * ms));
        ms *= 2;
      }
    }
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((ok) => setTimeout(ok, ms));
}

export const log = (msg: string, ...other: any[]) => {
  console.log(
    msg,
    other.map((o) => (typeof o === 'object' ? JSON.stringify(o, undefined, 2) : o)),
  );
};
