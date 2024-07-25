#!/usr/bin/env sh

# Usage: Can be invoked either independently, or with an npm tag suffix, in order to update to that tagged version of all packagers in the filter.
# e.g. `npx scripts/update-cli-dependencies.sh`
#      `npx scripts/update-cli-dependencies.sh @cdkv2`

FILTER="amplify-app @aws-amplify/amplify-app amplify-codegen @aws-amplify/amplify-appsync-simulator @aws-amplify/amplify-category-auth @aws-amplify/amplify-category-custom @aws-amplify/amplify-category-storage @aws-amplify/amplify-console-integration-tests @aws-amplify/amplify-e2e-core @aws-amplify/amplify-environment-parameters @aws-amplify/amplify-graphiql-explorer @aws-amplify/amplify-util-uibuilder @aws-amplify/cli @aws-amplify/cli-extensibility-helper @aws-amplify/cli-internal @aws-amplify/amplify-category-analytics @aws-amplify/amplify-category-function @aws-amplify/amplify-category-geo @aws-amplify/amplify-category-hosting @aws-amplify/amplify-category-interactions @aws-amplify/amplify-category-notifications @aws-amplify/amplify-category-predictions amplify-cli-core @aws-amplify/amplify-cli-core @aws-amplify/amplify-cli-logger amplify-cli-shared-interfaces amplify-console-hosting amplify-container-hosting amplify-dotnet-function-runtime-provider amplify-dotnet-function-template-provider amplify-dynamodb-simulator amplify-e2e-tests @aws-amplify/amplify-frontend-android @aws-amplify/amplify-frontend-flutter @aws-amplify/amplify-frontend-ios @aws-amplify/amplify-frontend-javascript amplify-function-plugin-interface amplify-go-function-runtime-provider @aws-amplify/amplify-go-function-template-provider amplify-graphql-migration-tests amplify-headless-interface amplify-java-function-runtime-provider amplify-java-function-template-provider amplify-nodejs-function-runtime-provider @aws-amplify/amplify-nodejs-function-template-provider amplify-prompts @aws-amplify/amplify-prompts @aws-amplify/amplify-provider-awscloudformation amplify-python-function-runtime-provider @aws-amplify/amplify-python-function-template-provider amplify-storage-simulator amplify-util-headless-input @aws-amplify/amplify-util-import @aws-amplify/amplify-util-mock amplify-velocity-template"

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
