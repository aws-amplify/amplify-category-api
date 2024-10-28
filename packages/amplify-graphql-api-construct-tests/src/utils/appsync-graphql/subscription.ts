import { randomUUID } from 'crypto';
import { OperationAuthInputAccessToken, OperationAuthInputApiKey } from './common';
import WebSocket from 'ws';
import * as url from 'url';

type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export type AppSyncSubscriptionAuth = OperationAuthInputAccessToken | OperationAuthInputApiKey;

export type SubscribeInput<Input, Output> = {
  query: GeneratedSubscription<Input, Output>;
  variables?: Input;
  auth: AppSyncSubscriptionAuth;
  /**
   * `id` for the subscription. If not provided, a random UUID will be generated.
   */
  id?: string;
};

/**
 * Manages subscriptions to AppSync realtime endpoints.
 *
 * @example
 * const client = new AppSyncSubscriptionClient(realtimeEndpoint, graphqlEndpoint);
 * const connection = await client.connect(auth);
 * const subscription = connection.subscribe({ query, variables, auth });
 *
 * for await (const value of subscription) {
 *   console.log(value);
 * }
 */
export class AppSyncConnection {
  // TODO: Add a `close` method for the connection.
  // TODO: Add a `close` method for individual subscriptions.

  subscriptions: Record<string, { stream: AsyncIterableIterator<any> }>;

  constructor(private client: AppSyncSubscriptionClient) {
    this.subscriptions = {};
  }

  subscribe<Input, Output>(input: SubscribeInput<Input, Output>): AsyncIterableIterator<Output> {
    const { query, variables, auth, id = randomUUID() } = input;
    const authHeaders = this.client.generateAuthHeaders(auth);
    const data = JSON.stringify({
      query,
      variables,
    });

    const subscriptionMessage = {
      id,
      payload: {
        data,
        extensions: {
          authorization: authHeaders,
        },
      },
      type: MESSAGE_TYPES.GQL_START,
    };

    this.client.ws.send(JSON.stringify(subscriptionMessage));

    const generator = async function* () {
      while (true) {
        yield new Promise<Output>((resolve, reject) => {
          this.client.ws.on('message', (data: any) => {
            const message = JSON.parse(data.toString());
            if (message.type === MESSAGE_TYPES.GQL_START_ACK && message.id === id) {
              // Subscription started, but no data yet
            } else if (message.type === MESSAGE_TYPES.GQL_DATA && message.id === id) {
              resolve(message.payload.data as Output);
            } else if (message.type === MESSAGE_TYPES.GQL_ERROR && message.id === id) {
              reject(new Error(message.payload.errors));
            } else if (message.type === MESSAGE_TYPES.GQL_COMPLETE && message.id === id) {
              return; // End of subscription
            }
          });
        });
      }
    }.bind(this)();

    const stream = {
      [Symbol.asyncIterator]() {
        return generator;
      },
      next() {
        return generator.next();
      },
    };

    this.subscriptions[id] = { stream };
    return stream;
  }
}

/**
 * A client for connecting to an AppSync realtime endpoint.
 *
 * @example
 * const client = new AppSyncSubscriptionClient(realtimeEndpoint, graphqlEndpoint);
 * const connection = await client.connect(auth);
 * const subscription = connection.subscribe({ query, variables, auth });
 */
export class AppSyncSubscriptionClient {
  ws: WebSocket;

  constructor(private realtimeEndpoint: string, private graphqlEndpoint: string) {}

  connect(auth: AppSyncSubscriptionAuth): Promise<AppSyncConnection> {
    const connectionHeaders = this.generateAuthHeaders(auth);
    const connectionUrl = this.generateConnectionUrl(connectionHeaders, '{}');

    this.ws = new WebSocket(connectionUrl, 'graphql-ws');
    this.ws.on('open', () => this.onOpen(this.ws));
    this.ws.on('close', this.onClose);

    return new Promise((resolve, reject) => {
      this.ws.addEventListener('message', ({ data }) => {
        const message = data.toString();
        if (JSON.parse(message).type === MESSAGE_TYPES.GQL_CONNECTION_ACK) {
          resolve(new AppSyncConnection(this));
        }
      });

      this.ws.addEventListener('error', ({ error }) => {
        reject(error);
      });
    });
  }

  private onClose() {
    // noop currently
  }

  private onOpen(ws: WebSocket) {
    // once the socket is open, we send the connection init message
    ws.send(
      JSON.stringify({
        type: MESSAGE_TYPES.GQL_CONNECTION_INIT,
      }),
    );
  }

  generateAuthHeaders(auth: AppSyncSubscriptionAuth) {
    const { host } = url.parse(this.graphqlEndpoint);
    if ('accessToken' in auth) {
      return {
        Authorization: auth.accessToken,
        host,
      };
    }

    if ('apiKey' in auth) {
      return {
        'x-api-key': auth.apiKey,
        host,
      };
    }
  }

  private generateConnectionUrl(headers: Record<string, string>, payload: string = '{}') {
    const headerString = JSON.stringify(headers);
    const encodedHeaders = Buffer.from(headerString).toString('base64');
    const encodedPayload = Buffer.from(payload).toString('base64');
    return `${this.realtimeEndpoint}?header=${encodedHeaders}&payload=${encodedPayload}`;
  }
}

/*
  Copy pasted from
  https://github.com/awslabs/aws-mobile-appsync-sdk-js/blob/ea05577f639ce4c473c51cff25e5b51ac78a0c0d/packages/aws-appsync-subscription-link/src/types/index.ts
*/
export enum MESSAGE_TYPES {
  /**
   * Client -> Server message.
   * This message type is the first message after handshake and this will initialize AWS AppSync RealTime communication
   */
  GQL_CONNECTION_INIT = 'connection_init',
  /**
   * Server -> Client message
   * This message type is in case there is an issue with AWS AppSync RealTime when establishing connection
   */
  GQL_CONNECTION_ERROR = 'connection_error',
  /**
   * Server -> Client message.
   * This message type is for the ack response from AWS AppSync RealTime for GQL_CONNECTION_INIT message
   */
  GQL_CONNECTION_ACK = 'connection_ack',
  /**
   * Client -> Server message.
   * This message type is for register subscriptions with AWS AppSync RealTime
   */
  GQL_START = 'start',
  /**
   * Server -> Client message.
   * This message type is for the ack response from AWS AppSync RealTime for GQL_START message
   */
  GQL_START_ACK = 'start_ack',
  /**
   * Server -> Client message.
   * This message type is for subscription message from AWS AppSync RealTime
   */
  GQL_DATA = 'data',
  /**
   * Server -> Client message.
   * This message type helps the client to know is still receiving messages from AWS AppSync RealTime
   */
  GQL_CONNECTION_KEEP_ALIVE = 'ka',
  /**
   * Client -> Server message.
   * This message type is for unregister subscriptions with AWS AppSync RealTime
   */
  GQL_STOP = 'stop',
  /**
   * Server -> Client message.
   * This message type is for the ack response from AWS AppSync RealTime for GQL_STOP message
   */
  GQL_COMPLETE = 'complete',
  /**
   * Server -> Client message.
   * This message type is for sending error messages from AWS AppSync RealTime to the client
   */
  GQL_ERROR = 'error', // Server -> Client
}

// #region async iterator utilities

/**
  * Merges multiple async iterators into a single async iterator, yielding values from each iterator with their corresponding names
  * Note: The combined iterator will yield values from each iterator as received, not necessarily in the order of the
  * elements of the `iterators` array. This is intentional -- it allows for merging streams from multiple subscriptions, including those
  * that are not expected to receive any events (e.g. resolver based authorization scenarios).

  * In the example below, `subscription2` may yield values before `subscription1`.
  *
  * @example
  * const merged = mergeNamedAsyncIterators([
  *   ['subscription1', subscription1],
  *   ['subscription2', subscription2],
  * ]);
  * for await (const [name, value] of merged) {
  *   console.log(name, value);
  * }
  */
export const mergeNamedAsyncIterators = async function* <T>(
  ...iterators: [name: string, stream: AsyncIterableIterator<T>][]
): AsyncIterableIterator<[name: string, value: T]> {
  const pending = new Set<Promise<[string, T] | null>>();
  const results: [string, T][] = [];

  const processIterator = async (name: string, stream: AsyncIterableIterator<T>) => {
    try {
      const { value, done } = await stream.next();
      if (done) return null;
      return [name, value] as [string, T];
    } catch (error) {
      return null;
    }
  };

  for (const [name, stream] of iterators) {
    const promise = processIterator(name, stream);
    pending.add(promise);

    // When this promise resolves, remove it from pending and add result if valid
    promise.then((result) => {
      pending.delete(promise);
      if (result) {
        results.push(result);
      }
    });
  }

  // Keep yielding while we have pending promises or results to return
  while (pending.size > 0 || results.length > 0) {
    // If we have results, yield the first one
    if (results.length > 0) {
      yield results.shift();
      continue;
    }

    // Wait for at least one promise to resolve
    if (pending.size > 0) {
      await Promise.race(Array.from(pending));
    }
  }
};

/**
  Consumes a given number of yields from an iterator.
  Returns an array of the yielded values, with undefined values for any yields that
  did not produce a value (due to the iterator being exhausted).

  @example
  // AsyncIterableIterator<{ foo: string }>
  const subscription = connection.subscribe({ query, variables, auth });
  // Array<{ foo: string } | undefined>
  const values = await consumeYields(subscription, 3);
*/
export async function consumeYields<T>(iterator: AsyncIterableIterator<T>, numYields: number): Promise<Array<T | undefined>> {
  const yieldsPromises = Array.from({ length: numYields }, () => iterator.next().then(({ value, done }) => (done ? undefined : value)));
  const yields = await Promise.all(yieldsPromises);
  return yields;
}

// #endregion async iterator utilities
