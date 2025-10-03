#!/bin/bash

# Fix imports in test files
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/import { S3, CognitoIdentityProviderClient as CognitoClient } from 'aws-sdk';/import { CognitoIdentityProviderClient as CognitoClient } from '@aws-sdk\/client-cognito-identity-provider';\nimport { S3Client as S3 } from '@aws-sdk\/client-s3';/g" {} \;

find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/import { CognitoIdentityProviderClient as CognitoClient, S3, CognitoIdentity } from 'aws-sdk';/import { CognitoIdentityProviderClient as CognitoClient } from '@aws-sdk\/client-cognito-identity-provider';\nimport { S3Client as S3 } from '@aws-sdk\/client-s3';\nimport { CognitoIdentityClient as CognitoIdentity } from '@aws-sdk\/client-cognito-identity';/g" {} \;

find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/import { CognitoIdentityProviderClient as CognitoClient, CognitoIdentity, S3 } from 'aws-sdk';/import { CognitoIdentityProviderClient as CognitoClient } from '@aws-sdk\/client-cognito-identity-provider';\nimport { CognitoIdentityClient as CognitoIdentity } from '@aws-sdk\/client-cognito-identity';\nimport { S3Client as S3 } from '@aws-sdk\/client-s3';/g" {} \;

find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/import { CognitoIdentityProviderClient as CognitoClient, S3 } from 'aws-sdk';/import { CognitoIdentityProviderClient as CognitoClient } from '@aws-sdk\/client-cognito-identity-provider';\nimport { S3Client as S3 } from '@aws-sdk\/client-s3';/g" {} \;

find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/import { S3, CognitoIdentityProviderClient as CognitoClient, CognitoIdentity } from 'aws-sdk';/import { CognitoIdentityProviderClient as CognitoClient } from '@aws-sdk\/client-cognito-identity-provider';\nimport { CognitoIdentityClient as CognitoIdentity } from '@aws-sdk\/client-cognito-identity';\nimport { S3Client as S3 } from '@aws-sdk\/client-s3';/g" {} \;

echo "Fixed imports in test files"
