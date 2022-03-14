#!/usr/bin/env bash

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

# Add missing type dependencies
yarn add -D @types/glob -W
lerna add --dev @types/lodash packages/amplify-e2e-tests

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
jq '.scripts."setup-dev" = "(yarn && lerna run build) && yarn add-cli-no-save && (yarn hoist-cli && yarn rm-dev-link && yarn link-dev)"' package.json > package.json.updated
mv package.json.updated package.json
jq '.scripts."setup-dev-win" = "(yarn && lerna run build) && yarn add-cli-no-save && (yarn hoist-cli && yarn rm-dev-link && yarn link-win)"' package.json > package.json.updated
mv package.json.updated package.json
jq '.scripts."add-cli-no-save" = "yarn add @aws-amplify/cli -W && git restore package.json"' package.json > package.json.updated
mv package.json.updated package.json
jq '.scripts."hoist-cli" = "rimraf node_modules/amplify-cli && mkdir node_modules/amplify-cli && cp -r node_modules/@aws-amplify/cli/ node_modules/amplify-cli"' package.json > package.json.updated
mv package.json.updated package.json

# Remove references to amplify-app packages and steps
# removed references to amplify-app *aa build targets
# TODO

# Remove files not related to api category
rm amplifycli_react_tutorial.md
rm native_guide.md

# Update unit test with undeclared dependency
cat << EOM > packages/graphql-transformer-core/src/__tests__/util/amplifyUtils.test.ts
import { getSanityCheckRules, SanityCheckRules } from '../../util/amplifyUtils';
import { FeatureFlags } from 'amplify-cli-core';

jest.mock('amplify-cli-core');

const buildMockedFeatureFlags = (flagValue: boolean) => {
  return {
    getBoolean: jest.fn(() => flagValue),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getObject: jest.fn(),
  };
};

describe('get sanity check rules', () => {
  test('empty list when api is in create status', () => {
    const sanityCheckRules: SanityCheckRules = getSanityCheckRules(true, buildMockedFeatureFlags(true));
    expect(sanityCheckRules.diffRules.length).toBe(0);
    expect(sanityCheckRules.projectRules.length).toBe(0);
  });

  test('sanitycheck rule list when api is in update status and ff enabled', () => {
    const sanityCheckRules: SanityCheckRules = getSanityCheckRules(false, buildMockedFeatureFlags(true));
    const diffRulesFn = sanityCheckRules.diffRules.map(func => func.name);
    const projectRulesFn = sanityCheckRules.projectRules.map(func => func.name);
    expect(diffRulesFn).toMatchSnapshot();
    expect(projectRulesFn).toMatchSnapshot();
  });

  test('sanitycheck rule list when api is in update status and no ff enabled', () => {
    const sanityCheckRules: SanityCheckRules = getSanityCheckRules(false, buildMockedFeatureFlags(false));
    const diffRulesFn = sanityCheckRules.diffRules.map(func => func.name);
    const projectRulesFn = sanityCheckRules.projectRules.map(func => func.name);
    expect(diffRulesFn).toMatchSnapshot();
    expect(projectRulesFn).toMatchSnapshot();
  });

  test('sanity check rule list when destructive changes flag is present and ff enabled', () => {
    const sanityCheckRules: SanityCheckRules = getSanityCheckRules(false, buildMockedFeatureFlags(true), true);
    const diffRulesFn = sanityCheckRules.diffRules.map(func => func.name);
    const projectRulesFn = sanityCheckRules.projectRules.map(func => func.name);
    expect(diffRulesFn).toMatchSnapshot();
    expect(projectRulesFn).toMatchSnapshot();
  });

  test('sanity check rule list when destructive changes flag is present but ff not enabled', () => {
    const sanityCheckRules: SanityCheckRules = getSanityCheckRules(false, buildMockedFeatureFlags(false), true);
    const diffRulesFn = sanityCheckRules.diffRules.map(func => func.name);
    const projectRulesFn = sanityCheckRules.projectRules.map(func => func.name);
    expect(diffRulesFn).toMatchSnapshot();
    expect(projectRulesFn).toMatchSnapshot();
  });
});
EOM

# You need to commit, otherwise the `add-cli-no-save` build step will undo the `package.json` updates.
git add .
git commit -m "Updates to support split from CLI repo"

# Run Build
yarn setup-dev

git add yarn.lock
git commit --amend

# Run Unit Tests
yarn test

# Run E2E Tests
yarn e2e # command is SUPER slow, give it a a few minutes

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
