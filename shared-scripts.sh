#!/bin/bash

# set exit on error to true
set -e

# storeCache <local path> <cache location>
function storeCache {
  localPath="$1"
  alias="$2"
  s3Path="s3://$CACHE_BUCKET_NAME/$CODEBUILD_SOURCE_VERSION/$alias"
  echo "Writing cache to $s3Path"
  # zip contents and upload to s3
  if ! (cd $localPath && tar cz . | aws s3 cp - $s3Path); then
      echo "Something went wrong storing the cache."
  fi
  echo "Done writing cache"
  cd $CODEBUILD_SRC_DIR
}
# loadCache <cache location> <local path>
function loadCache {
  alias="$1"
  localPath="$2"
  s3Path="s3://$CACHE_BUCKET_NAME/$CODEBUILD_SOURCE_VERSION/$alias"
  echo "Loading cache from $s3Path"
  # create directory if it doesn't exist yet
  mkdir -p $localPath
  # check if cache exists in s3
  if ! aws s3 ls $s3Path > /dev/null; then
      echo "Cache not found."
      exit 0
  fi
  # load cache and unzip it
  if ! (cd $localPath && aws s3 cp $s3Path - | tar xz); then
      echo "Something went wrong fetching the cache. Continuing anyway."
  fi
  echo "Done loading cache"
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