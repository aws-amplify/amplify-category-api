#!/bin/bash

# set exit on error to true
set -e

# storeCache <local path> <cache location>
function storeCache {
  localPath="$1"
  alias="$2"
  s3Path="s3://$CACHE_BUCKET_NAME/$CODEBUILD_SOURCE_VERSION/$alias"
  echo "Writing cache folder $alias to $s3Path"
  # zip contents and upload to s3
  if ! (cd $localPath && tar cz . | aws s3 cp - $s3Path); then
      echo "Something went wrong storing the cache folder $alias."
  fi
  echo "Done writing cache folder $alias"
  cd $CODEBUILD_SRC_DIR
}
# loadCache <cache location> <local path>
function loadCache {
  alias="$1"
  localPath="$2"
  s3Path="s3://$CACHE_BUCKET_NAME/$CODEBUILD_SOURCE_VERSION/$alias"
  echo "Loading cache folder from $s3Path"
  # create directory if it doesn't exist yet
  mkdir -p $localPath
  # check if cache exists in s3
  if ! aws s3 ls $s3Path > /dev/null; then
      echo "Cache folder $alias not found."
      exit 0
  fi
  # load cache and unzip it
  if ! (cd $localPath && aws s3 cp $s3Path - | tar xz); then
      echo "Something went wrong fetching the cache folder $alias. Continuing anyway."
  fi
  echo "Done loading cache folder $alias"
  cd $CODEBUILD_SRC_DIR
}
function storeCacheForBuildJob {
  # upload [repo, .cache] to s3
  storeCache $CODEBUILD_SRC_DIR repo
  storeCache $HOME/.cache .cache
}
function loadCacheFromBuildJob {
  # download [repo, .cache] from s3
  loadCache repo $CODEBUILD_SRC_DIR
  loadCache .cache $HOME/.cache
}
function storeCacheFile {
    localFilePath="$1"
    alias="$2"
    s3Path="s3://$CACHE_BUCKET_NAME/$CODEBUILD_SOURCE_VERSION/$alias"
    echo "Writing cache file $alias to $s3Path"
    # upload file to s3
    if ! (aws s3 cp $localFilePath $s3Path); then
        echo "Something went wrong storing the cache file $alias."
    fi
    echo "Done writing cache file $alias"
    cd $CODEBUILD_SRC_DIR
}
function loadCacheFile {
    alias="$1"
    localFilePath="$2"
    s3Path="s3://$CACHE_BUCKET_NAME/$CODEBUILD_SOURCE_VERSION/$alias"
    echo "Loading cache file $alias from $s3Path"
    # check if cache file exists in s3
    if ! aws s3 ls $s3Path > /dev/null; then
        echo "Cache file $alias not found."
        exit 0
    fi
    # load cache file
    if ! (aws s3 cp $s3Path $localFilePath); then
        echo "Something went wrong fetching the cache file $alias. Continuing anyway."
    fi
    echo "Done loading cache file $alias"
    cd $CODEBUILD_SRC_DIR
}

function _setShell {
  echo "Setting Shell"
  yarn config set script-shell $(which bash)
}
function _buildLinux {
  _setShell
  echo "Linux Build"
  yarn run production-build
  yarn build-tests
  storeCacheForBuildJob
}
function _testLinux {
  echo "Run Unit Test"
  loadCacheFromBuildJob
  yarn test-ci
}
function _verifyAPIExtract {
  echo "Verify API Extract"
  loadCacheFromBuildJob
  yarn verify-api-extract
}
function _verifyYarnLock {
  echo "Verify Yarn Lock"
  loadCacheFromBuildJob
  yarn verify-yarn-lock
}
function _verifyCDKVersion {
  echo "Verify CDK Version"
  loadCacheFromBuildJob
  yarn ts-node .circleci/validate_cdk_version.ts
}
function _mockE2ETests {
  echo "Mock E2E Tests"
  loadCacheFromBuildJob
  source .circleci/local_publish_helpers.sh
  cd packages/amplify-util-mock/
  yarn e2e
}
function _lint {
  echo "Lint"
  loadCacheFromBuildJob
  chmod +x codebuild_specs/scripts/lint_pr.sh && ./codebuild_specs/scripts/lint_pr.sh
}
function _publishToLocalRegistry {
    echo "Publish To Local Registry"
    loadCacheFromBuildJob

    source ./.circleci/local_publish_helpers.sh && startLocalRegistry "$CODEBUILD_SRC_DIR/.circleci/verdaccio.yaml"
    setNpmRegistryUrlToLocal
    git config user.email not@used.com
    git config user.name "Doesnt Matter"
    setNpmTag
    if [ -z $NPM_TAG ]; then
      yarn publish-to-verdaccio
    else
      yarn lerna publish --exact --dist-tag=latest --preid=$NPM_TAG --conventional-commits --conventional-prerelease --no-verify-access --yes --no-commit-hooks --no-push --no-git-tag-version
    fi
    unsetNpmRegistryUrl

    echo "Generate Change Log"
    git reset --hard HEAD
    yarn update-versions
    yarn ts-node scripts/unified-changelog.ts
    
    echo "LS HOME"
    ls $CODEBUILD_SRC_DIR/..

    echo "LS REPO"
    ls $CODEBUILD_SRC_DIR

    # copy [verdaccio-cache, changelog to s3]
    storeCache $CODEBUILD_SRC_DIR/../verdaccio-cache verdaccio-cache

    storeCacheFile $CODEBUILD_SRC_DIR/UNIFIED_CHANGELOG.md UNIFIED_CHANGELOG.md
}
function _install_cli_from_local_registry {
    echo "Start verdaccio, install CLI"
    source .circleci/local_publish_helpers.sh
    startLocalRegistry "$$CODEBUILD_SRC_DIR/.circleci/verdaccio.yaml"
    setNpmRegistryUrlToLocal
    changeNpmGlobalPath
    npm install -g @aws-amplify/cli-internal@11.0.3
    echo "using Amplify CLI version: "$(amplify --version)
    npm list -g --depth=1
    unsetNpmRegistryUrl
}
function _loadTestAccountCredentials {
    echo ASSUMING PARENT TEST ACCOUNT credentials
    session_id=$((1 + $RANDOM % 10000))
    creds=$(aws sts assume-role --role-arn $TEST_ACCOUNT_ROLE --role-session-name testSession${session_id} --duration-seconds 3600)
    if [ -z $(echo $creds | jq -c -r '.AssumedRoleUser.Arn') ]; then
        echo "Unable to assume parent e2e account role."
        return
    fi
    echo "Using account credentials for $(echo $creds | jq -c -r '.AssumedRoleUser.Arn')"
    export AWS_ACCESS_KEY_ID=$(echo $creds | jq -c -r ".Credentials.AccessKeyId")
    export AWS_SECRET_ACCESS_KEY=$(echo $creds | jq -c -r ".Credentials.SecretAccessKey")
    export AWS_SESSION_TOKEN=$(echo $creds | jq -c -r ".Credentials.SessionToken")
}
function _runE2ETestsLinux {
    echo "RUN E2E Tests Linux"
    
    loadCache repo $CODEBUILD_SRC_DIR
    loadCache .cache $HOME/.cache
    loadCache verdaccio-cache $CODEBUILD_SRC_DIR/../verdaccio-cache
    loadCacheFile UNIFIED_CHANGELOG.md $CODEBUILD_SRC_DIR/UNIFIED_CHANGELOG.md

    _install_cli_from_local_registry  
    cd packages/amplify-e2e-tests
    echo "export PATH=$AMPLIFY_DIR:$PATH" >> $BASH_ENV
    source $BASH_ENV
    source .circleci/local_publish_helpers.sh
    amplify version
    echo "Run Amplify E2E tests"
    echo $TEST_SUITE
    _loadTestAccountCredentials
    retry runE2eTest
}


function _scanArtifacts {
    if ! yarn ts-node .circleci/scan_artifacts_codebuild.ts; then
        echo "Cleaning the repository"
        git clean -fdx
        exit 1
    fi
}