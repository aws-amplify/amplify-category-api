import { Sha256 } from '@aws-crypto/sha256-js';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest, IHttpRequest } from '@smithy/protocol-http';
import { AwsCredentialIdentity, Provider } from '@smithy/types';
import { HttpRequestOptions } from './aws-sdk-http-request';

export interface MakeSignedRequestOptions {
  requestOptions: HttpRequestOptions;
  credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>;
  region: string | Provider<string>;
  service: string;
}

export const makeSignedRequest = async (options: MakeSignedRequestOptions): Promise<IHttpRequest> => {
  const { requestOptions, credentials, region, service } = options;
  const signer = new SignatureV4({
    credentials,
    region,
    service,
    sha256: Sha256,
    uriEscapePath: true,
  });

  const signedRequest = await signer.sign(new HttpRequest(requestOptions));

  return signedRequest;
};

export interface MakeTemporaryCredentialsProviderOptions {
  roleArn: string;
  region: string | Provider<string>;
  sessionNamePrefix: string | Provider<string>;
}

/**
 * Returns a credential provider that will invoke `sts:AssumeRole` to the specified `roleArn` and return the session credentials. Uses
 * default resolution for master credentials. See
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-credential-providers/
 */
export const makeTemporaryCredentialsProvider = (options: MakeTemporaryCredentialsProviderOptions): Provider<AwsCredentialIdentity> => {
  const { roleArn, region, sessionNamePrefix } = options;
  return fromTemporaryCredentials({
    params: {
      RoleArn: roleArn,
      RoleSessionName: `${sessionNamePrefix}-${Date.now()}`,
    },
    clientConfig: { region },
  });
};
