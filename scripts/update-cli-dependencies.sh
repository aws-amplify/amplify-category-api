#!/usr/bin/env sh

# Usage: Can be invoked either independently, or with an npm tag suffix, in order to update to that tagged version of all packagers in the filter.
# e.g. `npx scripts/update-cli-dependencies.sh`
#      `npx scripts/update-cli-dependencies.sh @cdkv2`

FILTER="amplify-app amplify-codegen @aws-amplify/amplify-appsync-simulator @aws-amplify/amplify-category-auth @aws-amplify/amplify-category-custom @aws-amplify/amplify-category-storage @aws-amplify/amplify-console-integration-tests @aws-amplify/amplify-e2e-core @aws-amplify/amplify-environment-parameters @aws-amplify/amplify-graphiql-explorer @aws-amplify/amplify-migration-tests @aws-amplify/amplify-util-uibuilder @aws-amplify/cli @aws-amplify/cli-extensibility-helper @aws-amplify/cli-internal amplify-category-analytics amplify-category-function amplify-category-geo amplify-category-hosting amplify-category-interactions amplify-category-notifications amplify-category-predictions amplify-cli-core amplify-cli-logger amplify-cli-shared-interfaces amplify-console-hosting amplify-container-hosting amplify-dotnet-function-runtime-provider amplify-dotnet-function-template-provider amplify-dynamodb-simulator amplify-e2e-tests amplify-frontend-android amplify-frontend-flutter amplify-frontend-ios amplify-frontend-javascript amplify-function-plugin-interface amplify-go-function-runtime-provider amplify-go-function-template-provider amplify-graphql-migration-tests amplify-headless-interface amplify-java-function-runtime-provider amplify-java-function-template-provider amplify-nodejs-function-runtime-provider amplify-nodejs-function-template-provider amplify-prompts amplify-provider-awscloudformation amplify-python-function-runtime-provider amplify-python-function-template-provider amplify-storage-simulator amplify-util-headless-input amplify-util-import amplify-util-mock amplify-velocity-template"

if [ $# -eq 0 ]
  then
    echo "Updating to latest tag"
    npx ncu \
        --deep \
        --upgrade \
        --dep "prod,dev,peer,bundle,optional" \
        --filter "$FILTER"
  else 
    echo "Updating to $1 tag"
    npx ncu \
        --deep \
        --upgrade \
        --dep "prod,dev,peer,bundle,optional" \
        --filter "$FILTER" \
        --target $1
fi
