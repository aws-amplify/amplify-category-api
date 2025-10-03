#!/bin/bash

echo "Adding CreateBucketCommand imports..."

# Add CreateBucketCommand import to files that use it
grep -l "CreateBucketCommand" ./packages/graphql-transformers-e2e-tests/src/__tests__/*.ts | while read file; do
  if grep -q "import { S3Client } from '@aws-sdk/client-s3';" "$file"; then
    sed -i '' "s/import { S3Client } from '@aws-sdk\/client-s3';/import { S3Client, CreateBucketCommand } from '@aws-sdk\/client-s3';/g" "$file"
  fi
done

echo "Added CreateBucketCommand imports"
