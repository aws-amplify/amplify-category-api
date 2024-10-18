import { HttpMessage, URI } from '@smithy/types';

export type HttpRequestOptions = Partial<HttpMessage> &
  Partial<URI> & {
    method?: string;
  };

export const urlToHttpRequestOptions = (url: URL, method: string): HttpRequestOptions => {
  const query: Record<string, string> = {};
  const searchParams = Array.from(url.searchParams);

  searchParams.forEach(([key, value]) => {
    query[key] = value;
  });

  const requestOptions: HttpRequestOptions = {
    method,
    protocol: url.protocol,
    hostname: url.hostname,
    port: parseInt(url.port, 10),
    path: url.pathname,
    query,
    username: url.username,
    password: url.password,
    fragment: url.hash,
  };

  return requestOptions;
};
