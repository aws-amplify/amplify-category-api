#!/bin/bash

# Fix CognitoClient instantiations
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/new CognitoClient({ apiVersion: '2016-04-19', region: \([^}]*\) })/new CognitoClient({ region: \1 })/g" {} \;

# Fix CognitoIdentity instantiations  
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/new CognitoIdentity({ apiVersion: '2014-06-30', region: \([^}]*\) })/new CognitoIdentity({ region: \1 })/g" {} \;

# Fix S3 instantiations
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' "s/new S3({ region: \([^}]*\) })/new S3({ region: \1 })/g" {} \;

echo "Fixed client instantiations in test files"
