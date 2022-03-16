#!/usr/bin/env bash

# Install common tools
brew install jq
npm i -g relaxed-json

#######################################################
# https://github.com/aws-amplify/amplify-category-api #
#######################################################

# Clone Repo
git clone git@github.com:aws-amplify/amplify-category-api.git
cd amplify-category-api

# Setup Split Branch
git checkout -b split-from-cli

# Merge in latest to split branch
git remote add cli git@github.com:aws-amplify/amplify-cli.git
git fetch cli
git reset --hard cli/master

# Remove packages we won't be importing
(cd packages && rm -rf \
    amplify-appsync-simulator \
    amplify-category-analytics \
    amplify-category-api \
    amplify-category-auth \
    amplify-category-custom \
    amplify-category-function \
    amplify-category-geo \
    amplify-category-hosting \
    amplify-category-interactions \
    amplify-category-notifications \
    amplify-category-predictions \
    amplify-category-storage \
    amplify-category-xr \
    amplify-cli-core \
    amplify-cli-extensibility-helper \
    amplify-cli-logger \
    amplify-cli \
    amplify-console-hosting \
    amplify-console-integration-tests \
    amplify-container-hosting \
    amplify-dotnet-function-runtime-provider \
    amplify-dotnet-function-template-provider \
    amplify-dynamodb-simulator \
    amplify-frontend-android \
    amplify-frontend-flutter \
    amplify-frontend-ios \
    amplify-frontend-javascript \
    amplify-function-plugin-interface \
    amplify-go-function-runtime-provider \
    amplify-go-function-template-provider \
    amplify-graphiql-explorer \
    amplify-headless-interface \
    amplify-java-function-runtime-provider \
    amplify-java-function-template-provider \
    amplify-nodejs-function-runtime-provider \
    amplify-nodejs-function-template-provider \
    amplify-prompts \
    amplify-provider-awscloudformation \
    amplify-python-function-runtime-provider \
    amplify-python-function-template-provider \
    amplify-storage-simulator \
    amplify-util-headless-input \
    amplify-util-import \
    amplify-util-mock \
    amplify-util-uibuilder \
    amplify-velocity-template)

# Remove references to packaging step
rm -rf pkg
jq 'del(.scripts."pkg-clean", .scripts."pkg-all", .scripts."pkg-all-local")' package.json > package.json.updated
mv package.json.updated package.json

# Remove reference to removed package in e2e-core package
jq 'del(.references)' packages/amplify-e2e-core/tsconfig.json > packages/amplify-e2e-core/tsconfig.json.bak
mv packages/amplify-e2e-core/tsconfig.json.bak packages/amplify-e2e-core/tsconfig.json

# Use node_modules CLI instead of local while linking
jq '(.scripts."link-dev", .scripts."link-win") |= sub("packages/amplify-cli";"node_modules/amplify-cli")' package.json > package.json.updated
mv package.json.updated package.json

# Do CLI hoisting stuff (stolen from codegen builds)
jq '.scripts."setup-dev" = "(yarn && lerna run build) && yarn add-cli-no-save && (yarn hoist-cli && yarn rm-dev-link && yarn link-dev)" | .scripts."setup-dev-win" = "(yarn && lerna run build) && yarn add-cli-no-save && (yarn hoist-cli && yarn rm-dev-link && yarn link-win)" | .scripts."add-cli-no-save" = "yarn add @aws-amplify/cli -W && git restore package.json" | .scripts."hoist-cli" = "rimraf node_modules/amplify-cli && mkdir node_modules/amplify-cli && cp -r node_modules/@aws-amplify/cli/ node_modules/amplify-cli"' package.json > package.json.updated
mv package.json.updated package.json

# Remove files not related to api category
rm amplifycli_react_tutorial.md
rm native_guide.md

# You need to commit, otherwise the `add-cli-no-save` build step will undo the `package.json` updates.
git add .
git commit -m "Updates to support split from CLI repo"

# Use Node v12 (current LTS)
nvm install v12.22.10
nvm use v12.22.10

# Run Build
yarn setup-dev

git add yarn.lock
git commit --amend

# Run Unit Tests
yarn test

# Run E2E Tests
# Configure .env file (see /packages/e2e-tests/Readme.md for instructions)
yarn e2e

# Tests currently failing due to issues running ts-node based scripts
# Currently added npx to commands to get around the hanging
# all tests failing w/ `Could not create bucket: InvalidToken: The provided token is malformed or otherwise invalid.`

# Commit changes
git push --set-upstream origin auto-split

# Manual Steps to get CI and Publish working E2E
# TK

###############################################
# https://github.com/aws-amplify/amplify-cli/ #
###############################################

# Clone Repo
git clone git@github.com:aws-amplify/amplify-cli.git
cd amplify-cli

git checkout -b split-graphql-from-cli

# Remove packages we won't be importing
(cd packages && rm -rf \
    amplify-graphql-auth-transformer \
    amplify-graphql-default-value-transformer \
    amplify-graphql-function-transformer \
    amplify-graphql-http-transformer \
    amplify-graphql-index-transformer \
    amplify-graphql-maps-to-transformer \
    amplify-graphql-migration-tests \
    amplify-graphql-model-transformer \
    amplify-graphql-predictions-transformer \
    amplify-graphql-relational-transformer \
    amplify-graphql-schema-test-library \
    amplify-graphql-searchable-transformer \
    amplify-graphql-transformer-core \
    amplify-graphql-transformer-interfaces \
    amplify-graphql-transformer-migrator \
    amplify-migration-tests \
    graphql-auth-transformer \
    graphql-connection-transformer \
    graphql-dynamodb-transformer \
    graphql-elasticsearch-transformer \
    graphql-function-transformer \
    graphql-http-transformer \
    graphql-key-transformer \
    graphql-mapping-template \
    graphql-predictions-transformer \
    graphql-relational-schema-transformer \
    graphql-transformer-common \
    graphql-transformer-core \
    graphql-transformers-e2e-tests \
    graphql-versioned-transformer)

# Remove files not related to api category
rm graphql-transform-tutorial.md how-to-write-a-transformer.md testing-custom-indexes.md

# Remove reference to graphql-common in amplify-dotnet-function-template-provider and amplify-nodejs-function-template-provider
rjson packages/amplify-dotnet-function-template-provider/tsconfig.json | jq 'del(.references[] | select(.path == "../graphql-transformer-core"))' > packages/amplify-dotnet-function-template-provider/tsconfig.json.bak
mv packages/amplify-dotnet-function-template-provider/tsconfig.json.bak packages/amplify-dotnet-function-template-provider/tsconfig.json

rjson packages/amplify-nodejs-function-template-provider/tsconfig.json | jq 'del(.references[] | select(.path == "../graphql-transformer-core"))' > packages/amplify-nodejs-function-template-provider/tsconfig.json.bak
mv packages/amplify-nodejs-function-template-provider/tsconfig.json.bak packages/amplify-nodejs-function-template-provider/tsconfig.json

# Remove references to our packages in amplify-category-api
rjson packages/amplify-category-api/tsconfig.json | jq 'del(.references[] | select(.path == ("../graphql-transformer-core", "../amplify-graphql-transformer-migrator")))' > packages/amplify-category-api/tsconfig.json.bak
mv packages/amplify-category-api/tsconfig.json.bak packages/amplify-category-api/tsconfig.json

# Remove references ot our packages in amplify-provider-awscloudformation
rjson packages/amplify-provider-awscloudformation/tsconfig.json | jq 'del(.references[] | select(.path == ("../graphql-auth-transformer", "../graphql-connection-transformer", "../graphql-dynamodb-transformer", "../graphql-elasticsearch-transformer", "../graphql-function-transformer", "../graphql-http-transformer", "../graphql-key-transformer", "../graphql-predictions-transformer", "../graphql-transformer-core", "../graphql-versioned-transformer", "../amplify-graphql-transformer-core", "../amplify-graphql-transformer-interfaces", "../amplify-graphql-maps-to-transformer")))' > packages/amplify-provider-awscloudformation/tsconfig.json.bak
mv packages/amplify-provider-awscloudformation/tsconfig.json.bak packages/amplify-provider-awscloudformation/tsconfig.json

# Remove references ot our packages in amplify-category-function
rjson packages/amplify-category-function/tsconfig.json | jq 'del(.references[] | select(.path == "../graphql-transformer-core"))' > packages/amplify-category-function/tsconfig.json.bak
mv packages/amplify-category-function/tsconfig.json.bak packages/amplify-category-function/tsconfig.json

# Remove references ot our packages in amplify-util-mock
rjson packages/amplify-util-mock/tsconfig.json | jq 'del(.references[] | select(.path == ("../amplify-graphql-auth-transformer", "../amplify-graphql-model-transformer", "../amplify-graphql-maps-to-transformer")))' > packages/amplify-util-mock/tsconfig.json.bak
mv packages/amplify-util-mock/tsconfig.json.bak packages/amplify-util-mock/tsconfig.json

# Remove references ot our packages in amplify-cli
rjson packages/amplify-cli/tsconfig.json | jq 'del(.references[] | select(.path == "../graphql-transformer-core"))' > packages/amplify-cli/tsconfig.json.bak
mv packages/amplify-cli/tsconfig.json.bak packages/amplify-cli/tsconfig.json
