#!/usr/bin/env bash

# Install common tools
brew install jq
npm i -g relaxed-json

GITHUB_USERNAME=aws-amplify
REPO_BRANCH=api-split-m1
REPO_NAME=amplify-category-api
FIRST_SPLIT_MESSAGE="chore(amplify-category-api): split API plugin dependencies"

# Use Node v12 (current LTS)
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
nvm install v12.22.10
nvm use v12.22.10

#######################################################
# https://github.com/aws-amplify/amplify-category-api #
#######################################################

# Clone Repo
git clone git@github.com:$GITHUB_USERNAME/$REPO_NAME.git
cd $REPO_NAME

# Setup Split Branch
git checkout -b $REPO_BRANCH

# Pull in latest changes from CLI repo
git remote add cli git@github.com:aws-amplify/amplify-cli.git
git fetch cli
git reset --hard cli/master

# Remove packages we won't be importing
declare -a CLI_PACKAGES=(amplify-app \
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
    amplify-cli-npm \
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
    amplify-util-uibuilder \
    amplify-velocity-template)

(cd packages && rm -rf "${MIGRATED_PACKAGES[@]}")

# First commit: clean copy without any changes
git add .
git commit -m "$FIRST_SPLIT_MESSAGE" --no-verify

# Second commit: delete unrelated doc files
rm amplifycli_react_tutorial.md
rm native_guide.md

git add . 
git commit -m "chore(amplify-category-api): remove unrelated doc files" --no-verify

# Third commit: update package scripts, tsconfig
## Remove references to packaging step
rm -rf pkg
jq 'del(.scripts."pkg-clean", .scripts."pkg-all", .scripts."pkg-all-local")' package.json > package.json.updated
mv package.json.updated package.json

## Remove reference to removed package in e2e-core package
jq 'del(.references)' packages/amplify-e2e-core/tsconfig.json > packages/amplify-e2e-core/tsconfig.json.bak
mv packages/amplify-e2e-core/tsconfig.json.bak packages/amplify-e2e-core/tsconfig.json

## Use node_modules CLI instead of local while linking
jq '(.scripts."link-dev", .scripts."link-win") |= sub("packages/amplify-cli";"node_modules/amplify-cli")' package.json > package.json.updated
mv package.json.updated package.json

## Do CLI hoisting stuff (stolen from codegen builds)
jq '.scripts."setup-dev" = "(yarn && lerna run build) && yarn add-cli-no-save && (yarn hoist-cli && yarn rm-dev-link && yarn link-dev)" | .scripts."setup-dev-win" = "(yarn && lerna run build) && yarn add-cli-no-save && (yarn hoist-cli && yarn rm-dev-link && yarn link-win)" | .scripts."add-cli-no-save" = "yarn add @aws-amplify/cli -W && git restore package.json" | .scripts."hoist-cli" = "rimraf node_modules/amplify-cli && mkdir node_modules/amplify-cli && cp -r node_modules/@aws-amplify/cli/ node_modules/amplify-cli"' package.json > package.json.updated
mv package.json.updated package.json

# Use main instead of master branch name
jq '(.scripts."test-changed", .scripts."build-tests-changed", .scripts."postpublish:release") |= gsub("master"; "main")' package.json > package.json.updated
mv package.json.updated package.json

jq '(.scripts."publish:main" = .scripts."publish:master") | del(.scripts."publish:master")' package.json > package.json.updated
mv package.json.updated package.json

# Disable building test packages and split-e2e-tests script until ready
jq 'del(.husky.hooks."pre-push")' package.json > package.json.updated
mv package.json.updated package.json

# Remove reference to removed packages in amplify-util-mock
rjson packages/amplify-util-mock/tsconfig.json | jq 'del(.references[] | select(.path == ("../amplify-category-function", "../amplify-cli-core", "../amplify-storage-simulator", "../amplify-provider-awscloudformation", "../amplify-nodejs-function-runtime-provider")))' > packages/amplify-util-mock/tsconfig.json.bak
mv packages/amplify-util-mock/tsconfig.json.bak packages/amplify-util-mock/tsconfig.json

git add . 
git commit -m "chore(amplify-category-api): update package scripts, tsconfig"

# Fourth commit: update dependency on CLI packages
## update dependency on CLI packages to use caret(^)
cd packages

ALL_PACKAGE_MANIFESTS=$(find . -type f -name "package.json" -maxdepth 2)

declare -a CLI_PACKAGE_NAMES=( @aws-amplify/amplify-category-api \
@aws-amplify/amplify-category-auth \
@aws-amplify/amplify-category-custom \
@aws-amplify/amplify-category-storage \
@aws-amplify/cli-extensibility-helper \
@aws-amplify/cli \
@aws-amplify/cli-internal \
@aws-amplify/amplify-util-uibuilder)

CLI_PACKAGE_NAMES+=(${CLI_PACKAGES[@]})

for CLI_PACKAGE_NAME in ${CLI_PACKAGE_NAMES[@]}
do
    echo "updating dependency on $CLI_PACKAGE_NAME to caret(^)"
    for file in $ALL_PACKAGE_MANIFESTS
    do
        rjson $file | jq 'if .dependencies."'"${CLI_PACKAGE_NAME}"'"? then .dependencies."'"${CLI_PACKAGE_NAME}"'" = (.dependencies."'"${CLI_PACKAGE_NAME}"'" | split(".") | "^" + .[0] + "." + .[1] + "." + .[2]) elif .devDependencies."'"${CLI_PACKAGE_NAME}"'"? then .devDependencies."'"${CLI_PACKAGE_NAME}"'" = (.devDependencies."'"${CLI_PACKAGE_NAME}"'" | split(".") | "^" + .[0] + "." + .[1] + "." + .[2]) else . end' > $file.bak
        mv $file.bak $file
    done 
done

cd ..

git add .
git commit -m "chore(amplify-category-api): update dependency on CLI packages"

# Run Build
yarn setup-dev

# Run Unit Tests
yarn test

# Push local changes
git push --set-upstream origin $REPO_BRANCH
