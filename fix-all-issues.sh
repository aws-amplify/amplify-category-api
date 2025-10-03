#!/bin/bash

echo "Fixing all AWS SDK v2 to v3 migration issues in test files..."

# Fix import statements
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/import { Output } from 'aws-sdk\/clients\/cloudformation';/import { type Output } from '@aws-sdk\/client-cloudformation';/g" {} \;
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/import { default as CognitoClient } from 'aws-sdk\/clients\/cognitoidentityserviceprovider';/import { CognitoIdentityProviderClient as CognitoClient } from '@aws-sdk\/client-cognito-identity-provider';/g" {} \;
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/import { default as S3 } from 'aws-sdk\/clients\/s3';/import { S3Client } from '@aws-sdk\/client-s3';/g" {} \;

# Fix S3 client instantiations and usage
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/new S3({ region: \([^}]*\) })/new S3Client({ region: \1 })/g" {} \;
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/awsS3Client\.createBucket({ Bucket: bucketName })\.promise()/awsS3Client.send(new CreateBucketCommand({ Bucket: bucketName }))/g" {} \;

# Fix Lambda constructor calls (remove second parameter)
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/new Lambda(\([^,]*\), \([^)]*\))/new Lambda(\1)/g" {} \;

echo "Fixed all issues in test files"
