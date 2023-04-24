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

function _setShell {
    echo "Setting Shell"
    yarn config set script-shell $(which bash)
}
function _buildLinux {
    _setShell
    echo "Linux Build"
    yarn run production-build
    yarn build-tests
    storeCache $CODEBUILD_SRC_DIR repo
    storeCache $HOME/.cache .cache
}
function _testLinux {
    echo "Run Test"
    # download [repo, .cache from s3]
    loadCache repo $CODEBUILD_SRC_DIR
    loadCache .cache $HOME/.cache
    # run tests
    yarn test-ci
}
