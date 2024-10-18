import { ArnFormat } from 'aws-cdk-lib/core';
import { isOperationAuthInputApiKey } from '../../utils';
import { getAccountFromArn } from '../../utils/account-utils';

describe('test utilities', () => {
  describe('appsync-graphql', () => {
    describe('type predicates', () => {
      describe('isOperationAuthInputApiKey', () => {
        it('returns true for a stringy api key', () => {
          const apiKey = 'testApiKey';
          const apiEndpoint = 'testEndpoint';

          const args = {
            apiEndpoint,
            auth: { apiKey },
          };

          const input = {
            ...args,
            query: 'mock query',
            variables: {
              id: 'id123',
              owner: 'owner123',
            },
          };

          const { auth } = input;

          expect(isOperationAuthInputApiKey(auth)).toBeTruthy();
        });

        it('returns false for an undefined api key', () => {
          const apiEndpoint = 'testEndpoint';

          const args = {
            apiEndpoint,
            auth: { apiKey: undefined },
          };

          const input = {
            ...args,
            query: 'mock query',
            variables: {
              id: 'id123',
              owner: 'owner123',
            },
          };

          const { auth } = input;

          expect(isOperationAuthInputApiKey(auth)).toBeFalsy();
        });
      });
    });
  });

  describe('arn-utils', () => {
    describe('getAccountFromArn', () => {
      it('returns undefined for an undefined arn', () => {
        expect(getAccountFromArn()).not.toBeDefined();
      });

      it('process a CodeBuild ARN with default format', () => {
        const arn = 'arn:aws:codebuild:us-west-2:0123456789:build/codebuild-demo-project:b1e6661e-e4f2-4156-9ab9-82a19EXAMPLE';
        expect(getAccountFromArn(arn)).toEqual('0123456789');
      });

      it('process a CodeBuild ARN with the correct explicit format', () => {
        const arn = 'arn:aws:codebuild:us-west-2:0123456789:build/codebuild-demo-project:b1e6661e-e4f2-4156-9ab9-82a19EXAMPLE';
        expect(getAccountFromArn(arn, ArnFormat.SLASH_RESOURCE_NAME)).toEqual('0123456789');
      });

      // We expect this to work because we're not interested in the resource, only in the account, which is always separated by colons
      it('process a CodeBuild ARN with an incorrect explicit format', () => {
        const arn = 'arn:aws:codebuild:us-west-2:0123456789:build/codebuild-demo-project:b1e6661e-e4f2-4156-9ab9-82a19EXAMPLE';
        expect(getAccountFromArn(arn, ArnFormat.COLON_RESOURCE_NAME)).toEqual('0123456789');
      });
    });
  });
});
