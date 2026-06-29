/* eslint-disable no-constant-condition */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable func-style */

/**
 * Retry a block of code up to a maximum number of times
 */
export async function retry<A>(block: () => Promise<A>) {
  // Retry for 5 minutes
  const deadline = Date.now() + 300_000;

  let delay = 100;
  while (true) {
    try {
      return await block();
    } catch (e: any) {
      if (Date.now() < deadline && isRetryableError(e)) {
        await sleep(Math.floor(Math.random() * delay));
        delay *= 2;
      } else {
        throw e;
      }
    }
  }
}

function isRetryableError(e: Error) {
  if (['Throttling'].includes(e.name)) {
    return true;
  }

  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * An SDK paginator that properly handles retries of throttles
 *
 * For some reason, I'm seeing unretried 'Throttling' errors from the CFN client.
 */
export async function paginate<A>(pageFetcher: (token: string) => Promise<{ nextPage?: string; items?: A[] }>): Promise<A[]> {
  const ret: A[] = [];

  let token: undefined | string;
  do {
    const response = await retry(() => pageFetcher(token));
    ret.push(...(response.items ?? []));
    token = response.nextPage;
  } while (token);

  return ret;
}
