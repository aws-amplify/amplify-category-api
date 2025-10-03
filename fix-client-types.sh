#!/bin/bash

# Fix CognitoIdentityServiceProvider -> CognitoIdentityProviderClient
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' 's/CognitoIdentityServiceProvider/CognitoIdentityProviderClient/g' {} \;

# Fix CognitoIdentity -> CognitoIdentityClient  
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' 's/: CognitoIdentity/: CognitoIdentityClient/g' {} \;
find ./packages/graphql-transformers-e2e-tests/src/__tests__ -name "*.ts" -exec sed -i '' 's/new CognitoIdentity(/new CognitoIdentityClient(/g' {} \;

echo "Fixed client types in test files"
