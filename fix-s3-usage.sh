#!/bin/bash

echo "Fixing S3 usage patterns..."

# Fix S3 createBucket calls that use .promise()
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/awsS3Client\.createBucket({ Bucket: \([^}]*\) })\.promise()/awsS3Client.send(new CreateBucketCommand({ Bucket: \1 }))/g" {} \;

# Add CreateBucketCommand import where needed
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec grep -l "CreateBucketCommand" {} \; | while read file; do
  if ! grep -q "CreateBucketCommand" "$file"; then
    sed -i '' "s/import { S3Client } from '@aws-sdk\/client-s3';/import { S3Client, CreateBucketCommand } from '@aws-sdk\/client-s3';/g" "$file"
  fi
done

echo "Fixed S3 usage patterns"
