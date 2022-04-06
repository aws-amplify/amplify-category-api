#!/usr/bin/env bash

# Install common tools
brew install jq
npm i -g relaxed-json

GITHUB_USERNAME=$(git config user.name)
REPO_BRANCH=api-split-m1
REPO_NAME=amplify-cli
FIRST_SPLIT_MESSAGE="chore(amplify-category-api): split API plugin dependencies"

# Use Node v12 (current LTS)
nvm install v12.22.10
nvm use v12.22.10

###############################################
# https://github.com/aws-amplify/amplify-cli/ #
###############################################

# Clone Repo
git clone git@github.com:$GITHUB_USERNAME/$REPO_NAME.git
cd $REPO_NAME

git checkout -b $REPO_BRANCH

# Remove packages that are moved to Data repo
declare -a MIGRATED_PACKAGES=(amplify-graphql-auth-transformer \
    amplify-graphql-default-value-transformer \
    amplify-graphql-function-transformer \
    amplify-graphql-http-transformer \
    amplify-graphql-index-transformer \
    amplify-graphql-maps-to-transformer \
    amplify-graphql-model-transformer \
    amplify-graphql-predictions-transformer \
    amplify-graphql-relational-transformer \
    amplify-graphql-schema-test-library \
    amplify-graphql-searchable-transformer \
    amplify-graphql-transformer-core \
    amplify-graphql-transformer-interfaces \
    amplify-graphql-transformer-migrator \
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

(cd packages && rm -rf "${MIGRATED_PACKAGES[@]}")

# First commit: raw split
git add .
git commit -m "$FIRST_SPLIT_MESSAGE" --no-verify

# Second commit: delete unrelated doc files
rm graphql-transform-tutorial.md how-to-write-a-transformer.md testing-custom-indexes.md

git add .
git commit -m "chore(amplify-category-api): remove unrelated doc files" --no-verify

# Third commit: update package scripts, tsconfig
## Remove reference to migrated packages from tsconfig
rjson packages/amplify-dotnet-function-template-provider/tsconfig.json | jq 'del(.references[] | select(.path == "../graphql-transformer-core"))' > packages/amplify-dotnet-function-template-provider/tsconfig.json.bak
mv packages/amplify-dotnet-function-template-provider/tsconfig.json.bak packages/amplify-dotnet-function-template-provider/tsconfig.json

rjson packages/amplify-nodejs-function-template-provider/tsconfig.json | jq 'del(.references[] | select(.path == "../graphql-transformer-core"))' > packages/amplify-nodejs-function-template-provider/tsconfig.json.bak
mv packages/amplify-nodejs-function-template-provider/tsconfig.json.bak packages/amplify-nodejs-function-template-provider/tsconfig.json

rjson packages/amplify-category-api/tsconfig.json | jq 'del(.references[] | select(.path == ("../graphql-transformer-core", "../amplify-graphql-transformer-migrator")))' > packages/amplify-category-api/tsconfig.json.bak
mv packages/amplify-category-api/tsconfig.json.bak packages/amplify-category-api/tsconfig.json

rjson packages/amplify-provider-awscloudformation/tsconfig.json | jq 'del(.references[] | select(.path == ("../graphql-auth-transformer", "../graphql-connection-transformer", "../graphql-dynamodb-transformer", "../graphql-elasticsearch-transformer", "../graphql-function-transformer", "../graphql-http-transformer", "../graphql-key-transformer", "../graphql-predictions-transformer", "../graphql-transformer-core", "../graphql-versioned-transformer", "../amplify-graphql-transformer-core", "../amplify-graphql-transformer-interfaces", "../amplify-graphql-maps-to-transformer")))' > packages/amplify-provider-awscloudformation/tsconfig.json.bak
mv packages/amplify-provider-awscloudformation/tsconfig.json.bak packages/amplify-provider-awscloudformation/tsconfig.json

rjson packages/amplify-category-function/tsconfig.json | jq 'del(.references[] | select(.path == "../graphql-transformer-core"))' > packages/amplify-category-function/tsconfig.json.bak
mv packages/amplify-category-function/tsconfig.json.bak packages/amplify-category-function/tsconfig.json

rjson packages/amplify-util-mock/tsconfig.json | jq 'del(.references[] | select(.path == ("../amplify-graphql-auth-transformer", "../amplify-graphql-model-transformer", "../amplify-graphql-maps-to-transformer")))' > packages/amplify-util-mock/tsconfig.json.bak
mv packages/amplify-util-mock/tsconfig.json.bak packages/amplify-util-mock/tsconfig.json

rjson packages/amplify-cli/tsconfig.json | jq 'del(.references[] | select(.path == "../graphql-transformer-core"))' > packages/amplify-cli/tsconfig.json.bak
mv packages/amplify-cli/tsconfig.json.bak packages/amplify-cli/tsconfig.json

rjson packages/amplify-appsync-simulator/tsconfig.tests.json | jq 'del(.references[] | select(.path == ("../graphql-auth-transformer", "../graphql-connection-transformer", "../graphql-dynamodb-transformer", "../graphql-elasticsearch-transformer", "../graphql-function-transformer", "../graphql-http-transformer", "../graphql-key-transformer", "../graphql-mapping-template", "../graphql-predictions-transformer", "../graphql-transformer-common", "../graphql-transformer-core", "../graphql-versioned-transformer")))' > packages/amplify-appsync-simulator/tsconfig.tests.json.bak
mv packages/amplify-appsync-simulator/tsconfig.tests.json.bak packages/amplify-appsync-simulator/tsconfig.tests.json

git add .
git commit -m "chore(amplify-category-api): update package scripts, tsconfig"

# Fourth commit: update dependency on migrated packages
## update dependency on migrated packages to use caret(^)
cd packages

ALL_PACKAGE_MANIFESTS=$(find . -type f -name "package.json" -maxdepth 2)

declare -a MIGRATED_PACKAGE_NAMES=('@aws-amplify/graphql-auth-transformer' \
"@aws-amplify/graphql-default-value-transformer" \
"@aws-amplify/graphql-function-transformer" \
"@aws-amplify/graphql-http-transformer" \
"@aws-amplify/graphql-index-transformer" \
"@aws-amplify/graphql-maps-to-transformer" \
"@aws-amplify/graphql-model-transformer" \
"@aws-amplify/graphql-predictions-transformer" \
"@aws-amplify/graphql-relational-transformer" \
"@aws-amplify/graphql-schema-test-library" \
"@aws-amplify/graphql-searchable-transformer" \
"@aws-amplify/graphql-transformer-core" \
"@aws-amplify/graphql-transformer-interfaces" \
"@aws-amplify/graphql-transformer-migrator")

MIGRATED_PACKAGE_NAMES+=(${MIGRATED_PACKAGES[@]})

for MIGRATED_PACKAGE_NAME in ${MIGRATED_PACKAGE_NAMES[@]}
do
    echo "updating dependency on $MIGRATED_PACKAGE_NAME to caret(^)"
    for file in $ALL_PACKAGE_MANIFESTS
    do
        rjson $file | jq 'if .dependencies."'"${MIGRATED_PACKAGE_NAME}"'"? then .dependencies."'"${MIGRATED_PACKAGE_NAME}"'" = (.dependencies."'"${MIGRATED_PACKAGE_NAME}"'" | split(".") | "^" + .[0] + "." + .[1] + "." + .[2]) elif .devDependencies."'"${MIGRATED_PACKAGE_NAME}"'"? then .devDependencies."'"${MIGRATED_PACKAGE_NAME}"'" = (.devDependencies."'"${MIGRATED_PACKAGE_NAME}"'" | split(".") | "^" + .[0] + "." + .[1] + "." + .[2]) else . end' > $file.bak
        mv $file.bak $file
    done 
done

cd ..

git add .
git commit -m "chore(amplify-category-api): update dependency on migrated packages"


# Run Build
yarn setup-dev

# Run Unit Tests
yarn test

# Push local changes
git push --set-upstream origin $REPO_BRANCH
