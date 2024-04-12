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
function _verifyDependencyLicensesExtract {
  echo "Verify Dependency Licenses Extract"
  loadCacheFromBuildJob
  yarn verify-dependency-licenses-extract
}
function _verifyCDKVersion {
  echo "Verify CDK Version"
  loadCacheFromBuildJob
  yarn ts-node scripts/validate_cdk_version.ts
}
function _mockE2ETests {
  echo "Mock E2E Tests"
  loadCacheFromBuildJob
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
    if [ -z "$BRANCH_NAME" ]; then
      if [ -z "$CODEBUILD_WEBHOOK_TRIGGER" ]; then
        export BRANCH_NAME="$(git symbolic-ref HEAD --short 2>/dev/null)"
        if [ "$BRANCH_NAME" = "" ] ; then
          BRANCH_NAME="$(git rev-parse HEAD | xargs git name-rev | cut -d' ' -f2 | sed 's/remotes\/origin\///g')";
        fi
      elif [[ "$CODEBUILD_WEBHOOK_TRIGGER" == "pr/"* ]]; then
        export BRANCH_NAME=${CODEBUILD_WEBHOOK_BASE_REF##*/}
      fi
    fi
    echo $BRANCH_NAME
    git checkout $BRANCH_NAME
  
    # Fetching git tags from upstream
    # For forked repo only
    # Can be removed when using team account
    echo "fetching tags"
    git fetch --tags https://github.com/aws-amplify/amplify-category-api
    # Create the folder to avoid failure when no packages are published due to no change detected
    mkdir ../verdaccio-cache

    source codebuild_specs/scripts/local_publish_helpers.sh
    startLocalRegistry "$(pwd)/codebuild_specs/scripts/verdaccio.yaml"
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
    # copy [verdaccio-cache] to s3
    storeCache $CODEBUILD_SRC_DIR/../verdaccio-cache verdaccio-cache

    _generateChangeLog
}
function _generateChangeLog {
    echo "Generate Change Log"
    git reset --hard HEAD
    yarn update-versions
    yarn ts-node scripts/unified-changelog.ts
    # copy [changelog] to s3
    storeCacheFile $CODEBUILD_SRC_DIR/UNIFIED_CHANGELOG.md UNIFIED_CHANGELOG.md
}
function _installCLIFromLocalRegistry {
    echo "Start verdaccio, install CLI"
    source codebuild_specs/scripts/local_publish_helpers.sh
    startLocalRegistry "$(pwd)/codebuild_specs/scripts/verdaccio.yaml"
    setNpmRegistryUrlToLocal
    changeNpmGlobalPath
    # set longer timeout to avoid socket timeout error
    npm config set fetch-retries 5
    npm config set fetch-timeout 600000
    npm config set fetch-retry-mintimeout 30000
    npm config set fetch-retry-maxtimeout 180000
    npm config set maxsockets 1
    npm install -g @aws-amplify/cli-internal
    echo "using Amplify CLI version: "$(amplify --version)
    npm list -g --depth=1 | grep -e '@aws-amplify/amplify-category-api' -e 'amplify-codegen'
    unsetNpmRegistryUrl
}
function _loadTestAccountCredentials {
    echo ASSUMING PARENT TEST ACCOUNT credentials
    session_id=$((1 + $RANDOM % 10000))
    # Use longer time for parent account role
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
function _setupE2ETestsLinux {
    echo "Setup E2E Tests Linux"
    loadCacheFromBuildJob
    loadCache verdaccio-cache $CODEBUILD_SRC_DIR/../verdaccio-cache
    _installCLIFromLocalRegistry
    _loadTestAccountCredentials
    _setShell
}

function _setupCDKTestsLinux {
    echo "Setup E2E Tests Linux"
    loadCacheFromBuildJob
    loadCache verdaccio-cache $CODEBUILD_SRC_DIR/../verdaccio-cache
    _installCLIFromLocalRegistry
    yarn package
    _loadTestAccountCredentials
    _setShell
}

function _runE2ETestsLinux {
    echo "RUN E2E Tests Linux"
    retry runE2eTest
}

function _runCDKTestsLinux {
    echo "RUN CDK Tests Linux"
    retry runCDKTest
}

function _runGqlE2ETests {
    echo "RUN GraphQL E2E tests"
    loadCacheFromBuildJob
    _loadTestAccountCredentials
    retry runGraphQLE2eTest
}
function _runCanaryTest {
    echo RUN Canary Test
    loadCacheFromBuildJob
    loadCache verdaccio-cache $CODEBUILD_SRC_DIR/../verdaccio-cache
    _installCLIFromLocalRegistry  
    _loadTestAccountCredentials
    _setShell
    cd client-test-apps/js/api-model-relationship-app
    yarn --network-timeout 180000
    retry yarn test:ci
}
function _scanArtifacts {
    if ! yarn ts-node codebuild_specs/scripts/scan_artifacts.ts; then
        echo "Cleaning the repository"
        git clean -fdx
        exit 1
    fi
}
function _cleanupE2EResources {
  echo "Cleanup E2E resources"
  loadCacheFromBuildJob
  cd packages/amplify-e2e-tests
  echo "Running clean up script"
  build_batch_arn=$(aws codebuild batch-get-builds --ids $CODEBUILD_BUILD_ID | jq -r -c '.builds[0].buildBatchArn')
  echo "Cleanup resources for batch build $build_batch_arn"
  yarn clean-e2e-resources buildBatchArn $build_batch_arn
}
function _unassumeTestAccountCredentials {
    echo "Unassume Role"
    unset AWS_ACCESS_KEY_ID
    unset AWS_SECRET_ACCESS_KEY
    unset AWS_SESSION_TOKEN
}

# The following functions are forked from circleci local publish helper
# The e2e helper functions are moved for codebuild usage
function useChildAccountCredentials {
    if [ -z "$USE_PARENT_ACCOUNT" ]; then
        export AWS_PAGER=""
        export AWS_MAX_ATTEMPTS=5
        export AWS_STS_REGIONAL_ENDPOINTS=regional
        parent_acct=$(aws sts get-caller-identity | jq -cr '.Account')
        child_accts=$(aws organizations list-accounts | jq -c "[.Accounts[].Id | select(. != \"$parent_acct\")]")
        org_size=$(echo $child_accts | jq 'length')
        opt_in_regions=$(jq -r '.[] | select(.optIn == true) | .name' $CODEBUILD_SRC_DIR/scripts/e2e-test-regions.json)
        if echo "$opt_in_regions" | grep -qw "$CLI_REGION"; then
            child_accts=$(echo $child_accts | jq -cr '.[]')
            for child_acct in $child_accts; do
                # Get enabled opt-in regions for the child account
                enabled_regions=$(aws account list-regions --account-id $child_acct --region-opt-status-contains ENABLED)
                # Check if given opt-in region is enabled for the child account
                if echo "$enabled_regions" | jq -e ".Regions[].RegionName == \"$CLI_REGION\""; then
                    pick_acct=$child_acct
                    break
                fi
            done
        else
            pick_acct=$(echo $child_accts | jq -cr ".[$RANDOM % $org_size]")
        fi
        session_id=$((1 + $RANDOM % 10000))
        if [[ -z "$pick_acct" || -z "$session_id" ]]; then
          echo "Unable to find a child account. Falling back to parent AWS account"
          return
        fi
        creds=$(aws sts assume-role --role-arn arn:aws:iam::${pick_acct}:role/OrganizationAccountAccessRole --role-session-name testSession${session_id} --duration-seconds 3600)
        if [ -z $(echo $creds | jq -c -r '.AssumedRoleUser.Arn') ]; then
            echo "Unable to assume child account role. Falling back to parent AWS account"
            return
        fi
        export ORGANIZATION_SIZE=$org_size
        export CREDS=$creds
        echo "Using account credentials for $(echo $creds | jq -c -r '.AssumedRoleUser.Arn')"
        export AWS_ACCESS_KEY_ID=$(echo $creds | jq -c -r ".Credentials.AccessKeyId")
        export AWS_SECRET_ACCESS_KEY=$(echo $creds | jq -c -r ".Credentials.SecretAccessKey")
        export AWS_SESSION_TOKEN=$(echo $creds | jq -c -r ".Credentials.SessionToken")
    else
        echo "Using parent account credentials."
    fi
    echo "Region is set to use $CLI_REGION"
}

function retry {
    MAX_ATTEMPTS=2
    SLEEP_DURATION=5
    FIRST_RUN=true
    RUN_INDEX=0
    FAILED_TEST_REGEX_FILE="./amplify-e2e-reports/amplify-e2e-failed-test.txt"
    if [ -f  $FAILED_TEST_REGEX_FILE ]; then
        rm -f $FAILED_TEST_REGEX_FILE
    fi
    until [ $RUN_INDEX -ge $MAX_ATTEMPTS ]
    do
        echo "Attempting $@ with max retries $MAX_ATTEMPTS"
        setAwsAccountCredentials
        RUN_INDEX="$RUN_INDEX" "$@" && break
        RUN_INDEX=$[$RUN_INDEX+1]
        FIRST_RUN=false
        echo "Attempt $RUN_INDEX completed."
        sleep $SLEEP_DURATION
    done
    if [ $RUN_INDEX -ge $MAX_ATTEMPTS ]; then
        echo "failed: ${@}" >&2
        exit 1
    fi

    resetAwsAccountCredentials
    TEST_SUITE=${TEST_SUITE:-"TestSuiteNotSet"}
    aws cloudwatch put-metric-data --metric-name FlakyE2ETests --namespace amplify-category-api-e2e-tests --unit Count --value $RUN_INDEX --dimensions testFile=$TEST_SUITE --profile amplify-integ-test-user || true
    echo "Attempt $RUN_INDEX succeeded."
    exit 0 # don't fail the step if putting the metric fails
}

function resetAwsAccountCredentials {
    if [ -z "$AWS_ACCESS_KEY_ID_ORIG" ]; then
        echo "AWS Access Key environment variable is already set"
    else
        export AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID_ORIG
    fi
    if [ -z "$AWS_SECRET_ACCESS_KEY_ORIG" ]; then
        echo "AWS Secret Access Key environment variable is already set"
    else
        export AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY_ORIG
    fi
    if [ -z "$AWS_SESSION_TOKEN_ORIG" ]; then
        echo "AWS Session Token environment variable is already set"
    else
        export AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN_ORIG
    fi
}

function setAwsAccountCredentials {
    resetAwsAccountCredentials
    export AWS_ACCESS_KEY_ID_ORIG=$AWS_ACCESS_KEY_ID
    export AWS_SECRET_ACCESS_KEY_ORIG=$AWS_SECRET_ACCESS_KEY
    export AWS_SESSION_TOKEN_ORIG=$AWS_SESSION_TOKEN
    if [[ "$OSTYPE" == "msys" ]]; then
        # windows provided by circleci has this OSTYPE
        useChildAccountCredentials
    else
        echo "OSTYPE is $OSTYPE"
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip -o awscliv2.zip >/dev/null
        export PATH=$PATH:$(pwd)/aws/dist
        useChildAccountCredentials
    fi
}

function runE2eTest {
    FAILED_TEST_REGEX_FILE="./amplify-e2e-reports/amplify-e2e-failed-test.txt"

    if [ -z "$FIRST_RUN" ] || [ "$FIRST_RUN" == "true" ]; then
        echo "using Amplify CLI version: "$(amplify --version)
        cd $(pwd)/packages/amplify-e2e-tests
    fi

    if [ -f  $FAILED_TEST_REGEX_FILE ]; then
        # read the content of failed tests
        failedTests=$(<$FAILED_TEST_REGEX_FILE)
        yarn run e2e --maxWorkers=4 $TEST_SUITE -t "$failedTests"
    else
        yarn run e2e --maxWorkers=4 $TEST_SUITE
    fi
}

function runCDKTest {
    FAILED_TEST_REGEX_FILE="./amplify-e2e-reports/amplify-e2e-failed-test.txt"

    if [ -z "$FIRST_RUN" ] || [ "$FIRST_RUN" == "true" ]; then
        cd $(pwd)/packages/amplify-graphql-api-construct-tests
    fi

    if [ -f  $FAILED_TEST_REGEX_FILE ]; then
        # read the content of failed tests
        failedTests=$(<$FAILED_TEST_REGEX_FILE)
        yarn run e2e --maxWorkers=4 $TEST_SUITE -t "$failedTests"
    else
        yarn run e2e --maxWorkers=4 $TEST_SUITE
    fi
}

function runGraphQLE2eTest {
    FAILED_TEST_REGEX_FILE="./amplify-e2e-reports/amplify-e2e-failed-test.txt"

    if [ -z "$FIRST_RUN" ] || [ "$FIRST_RUN" == "true" ]; then
        cd $(pwd)/packages/graphql-transformers-e2e-tests
    fi

    if [ -f  $FAILED_TEST_REGEX_FILE ]; then
        # read the content of failed tests
        failedTests=$(<$FAILED_TEST_REGEX_FILE)
        yarn run e2e --maxWorkers=4 $TEST_SUITE -t "$failedTests"
    else
        yarn run e2e --maxWorkers=4 $TEST_SUITE
    fi
}

function _deploy {
  _setShell
  echo "Deploy"
  echo "Authenticate with NPM"
  PUBLISH_TOKEN=$(echo "$NPM_PUBLISH_TOKEN" | jq -r '.token')
  echo "//registry.npmjs.org/:_authToken=$PUBLISH_TOKEN" > ~/.npmrc
  ./codebuild_specs/scripts/publish.sh
}

# Accepts the value as an input parameter, i.e. 1 for success, 0 for failure.
function _emitCanaryMetric {
  aws cloudwatch \
    put-metric-data \
    --metric-name CanarySuccessRate \
    --namespace amplify-category-api-e2e-tests \
    --unit Count \
    --value $CODEBUILD_BUILD_SUCCEEDING \
    --dimensions branch=main \
    --region us-west-2
}

function _emitCreateApiCanaryMetric {
  aws cloudwatch \
    put-metric-data \
    --metric-name CreateApiCanarySuccessRate \
    --namespace amplify-category-api-e2e-tests \
    --unit Count \
    --value $CODEBUILD_BUILD_SUCCEEDING \
    --dimensions branch=main,region=$CLI_REGION \
    --region us-west-2
}

function _emitCDKConstructCanaryMetric {
  aws cloudwatch \
    put-metric-data \
    --metric-name $CANARY_METRIC_NAME \
    --namespace amplify-graphql-api-construct-tests \
    --unit Count \
    --value $CODEBUILD_BUILD_SUCCEEDING \
    --dimensions branch=release,region=$CLI_REGION \
    --region us-west-2
}
