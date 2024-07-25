import * as crypto from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { default as fetch, Request } from 'node-fetch';
import type { GraphqlProxiedLambdaResponse } from '../../../lambda-request';

if (!process.env.GRAPHQL_URL) throw new Error('GRAPHQL_URL not found in environment variables');
const graphqlEndpoint = new URL(process.env.GRAPHQL_URL);

if (!process.env.AWS_REGION) throw new Error('AWS_REGION not found in environment variables');
const region = process.env.AWS_REGION;

const query = /* GraphQL */ `
  mutation ($title: String!) {
    createTodo(input: { title: $title }) {
      id
      title
    }
  }
`;

const constructRequestBody = (title: string): string => JSON.stringify({ query, variables: { title } });

export type CreateTodoHandlerEvent = {
  title?: string;
};

export type CreateTodoResponseData = {
  createTodo: {
    id: string;
    title: string;
  };
};

export const handler = async (event: CreateTodoHandlerEvent): Promise<GraphqlProxiedLambdaResponse<CreateTodoResponseData>> => {
  console.log('Invoking with event payload', event);

  const title = event.title;
  if (!title) {
    throw new Error('title expected in input event');
  }

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region,
    service: 'appsync',
    sha256: crypto.Sha256,
  });

  const signedRequestBody = await signer.sign(
    new HttpRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: graphqlEndpoint.host,
      },
      hostname: graphqlEndpoint.host,
      path: graphqlEndpoint.pathname,
      body: constructRequestBody(title),
    }),
  );

  let statusCode = 200;
  let body: any;
  let response: any;

  try {
    response = await fetch(new Request(graphqlEndpoint, signedRequestBody));
    body = await response.json();
    if (body.errors) {
      statusCode = 400;
      body = { errors: body.errors };
    }
  } catch (error: any) {
    statusCode = 500;
    body = {
      errors: [
        {
          status: response?.status,
          message: error.message,
          stack: error.stack,
        },
      ],
    };
  }

  const responsePayload = { statusCode, body };
  console.log('Returning response', responsePayload);
  return responsePayload;
};
