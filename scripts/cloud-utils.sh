#!/bin/bash

# set exit on error to true
set -e
# load .env
set -o allexport
source ./scripts/.env set

REGION=us-east-1
CURR_BRANCH=$(git branch --show-current)

function authenticate {
    account_number=$1
    role_name=$2
    profile_name=$3
    echo Loading account credentials for Account $account_number with Role: $role_name...
    ada cred update --profile="${profile_name}" --account="${account_number}" --role=${role_name} --provider=isengard --once
    aws configure set region $REGION --profile $profile_name
}

function triggerProjectBatch {
    account_number=$1
    role_name=$2
    profile_name=$3
    project_name=$4
    target_branch=$5
    authenticate $account_number $role_name $profile_name
    echo AWS Account: $account_number
    echo Project: $project_name 
    echo Target Branch: $target_branch
    
    IMAGE_OVERRIDE_FLAG=""
    if [ -n "$CODEBUILD_IMAGE_OVERRIDE" ]; then
      IMAGE_OVERRIDE_FLAG="--image-override $CODEBUILD_IMAGE_OVERRIDE"
      echo "Using image override: $CODEBUILD_IMAGE_OVERRIDE"
    fi
    
    RESULT=$(aws codebuild start-build-batch --region=$REGION --profile="${profile_name}" --project-name $project_name --source-version=$target_branch \
     $IMAGE_OVERRIDE_FLAG \
     --environment-variables-override name=BRANCH_NAME,value=$target_branch,type=PLAINTEXT \
     --query 'buildBatch.id' --output text)
    echo "https://$REGION.console.aws.amazon.com/codesuite/codebuild/$account_number/projects/$project_name/batch/$RESULT?region=$REGION"
}

function triggerProjectBatchWithBuildspec {
    account_number=$1
    role_name=$2
    profile_name=$3
    project_name=$4
    target_branch=$5
    # Path (in the source) to a batchspec that overrides the project's default buildspec. Used by
    # the split e2e mode to fire one batch per generated spec against the same project.
    buildspec_override=$6
    authenticate $account_number $role_name $profile_name
    echo AWS Account: $account_number
    echo Project: $project_name
    echo Target Branch: $target_branch
    echo Buildspec Override: $buildspec_override

    IMAGE_OVERRIDE_FLAG=""
    if [ -n "$CODEBUILD_IMAGE_OVERRIDE" ]; then
      IMAGE_OVERRIDE_FLAG="--image-override $CODEBUILD_IMAGE_OVERRIDE"
      echo "Using image override: $CODEBUILD_IMAGE_OVERRIDE"
    fi

    RESULT=$(aws codebuild start-build-batch --region=$REGION --profile="${profile_name}" --project-name $project_name --source-version=$target_branch \
     --buildspec-override "$buildspec_override" \
     $IMAGE_OVERRIDE_FLAG \
     --environment-variables-override name=BRANCH_NAME,value=$target_branch,type=PLAINTEXT \
     --query 'buildBatch.id' --output text)
    echo "Batch ID: $RESULT"
    echo "https://$REGION.console.aws.amazon.com/codesuite/codebuild/$account_number/projects/$project_name/batch/$RESULT?region=$REGION"
}

function triggerProjectBatchWithDebugSession {
    account_number=$1
    role_name=$2
    profile_name=$3
    project_name=$4
    target_branch=$5
    authenticate $account_number $role_name $profile_name
    echo AWS Account: $account_number
    echo Project: $project_name 
    echo Target Branch: $target_branch
    debug_spec=$(cat codebuild_specs/debug_workflow.yml)
    
    IMAGE_OVERRIDE_FLAG=""
    if [ -n "$CODEBUILD_IMAGE_OVERRIDE" ]; then
      IMAGE_OVERRIDE_FLAG="--image-override $CODEBUILD_IMAGE_OVERRIDE"
      echo "Using image override: $CODEBUILD_IMAGE_OVERRIDE"
    fi
    
    RESULT=$(aws codebuild start-build-batch --region=$REGION --profile="${profile_name}" --project-name $project_name --source-version=$target_branch \
     --debug-session-enabled \
     --buildspec-override "$debug_spec" \
     $IMAGE_OVERRIDE_FLAG \
     --environment-variables-override name=BRANCH_NAME,value=$target_branch,type=PLAINTEXT \
     --query 'buildBatch.id' --output text)
    echo "https://$REGION.console.aws.amazon.com/codesuite/codebuild/$account_number/projects/$project_name/batch/$RESULT?region=$REGION"
}

function triggerProjectBatchWithEnvOverrides {
    account_number=$1
    role_name=$2
    profile_name=$3
    project_name=$4
    target_branch=$5
    shift 5
    authenticate $account_number $role_name $profile_name
    echo AWS Account: $account_number
    echo Project: $project_name
    echo Target Branch: $target_branch
    
    IMAGE_OVERRIDE_FLAG=""
    if [ -n "$CODEBUILD_IMAGE_OVERRIDE" ]; then
      IMAGE_OVERRIDE_FLAG="--image-override $CODEBUILD_IMAGE_OVERRIDE"
      echo "Using image override: $CODEBUILD_IMAGE_OVERRIDE"
    fi
    
    RESULT=$(aws codebuild start-build-batch --region=$REGION --profile="${profile_name}" --project-name $project_name --source-version=$target_branch \
     $IMAGE_OVERRIDE_FLAG \
     --environment-variables-override name=BRANCH_NAME,value=$target_branch,type=PLAINTEXT "$@" \
     --query 'buildBatch.id' --output text)
    echo "https://$REGION.console.aws.amazon.com/codesuite/codebuild/$account_number/projects/$project_name/batch/$RESULT?region=$REGION"
}

function triggerProject {
    account_number=$1
    role_name=$2
    profile_name=$3
    project_name=$4
    target_branch=$5
    authenticate $account_number $role_name $profile_name
    echo AWS Account: $account_number
    echo Project: $project_name 
    echo Target Branch: $target_branch
    
    IMAGE_OVERRIDE_FLAG=""
    if [ -n "$CODEBUILD_IMAGE_OVERRIDE" ]; then
      IMAGE_OVERRIDE_FLAG="--image-override $CODEBUILD_IMAGE_OVERRIDE"
      echo "Using image override: $CODEBUILD_IMAGE_OVERRIDE"
    fi
    
    RESULT=$(aws codebuild start-build --profile="${profile_name}" --project-name $project_name --source-version=$target_branch \
     $IMAGE_OVERRIDE_FLAG \
     --environment-variables-override name=BRANCH_NAME,value=$target_branch,type=PLAINTEXT \
     --query 'build.id' --output text)
    echo "https://$REGION.console.aws.amazon.com/codesuite/codebuild/$account_number/projects/$project_name/build/$RESULT?region=$REGION"
}

function cloudE2EBeta {
    echo Running Beta E2E Test Suite
    E2E_ROLE_NAME=CodebuildDeveloper
    E2E_PROFILE_NAME=AmplifyAPIE2EBeta
    E2E_PROJECT_NAME=amplify-category-api-e2e-workflow
    TARGET_BRANCH=$CURR_BRANCH
    triggerProjectBatch $E2E_ACCOUNT_BETA $E2E_ROLE_NAME $E2E_PROFILE_NAME $E2E_PROJECT_NAME $TARGET_BRANCH
}

function cloudE2E {
    echo Running Prod E2E Test Suite
    E2E_ROLE_NAME=CodebuildDeveloper
    E2E_PROFILE_NAME=AmplifyAPIE2EProd
    E2E_PROJECT_NAME=amplify-category-api-e2e-workflow
    TARGET_BRANCH=$CURR_BRANCH
    triggerProjectBatch $E2E_ACCOUNT_PROD $E2E_ROLE_NAME $E2E_PROFILE_NAME $E2E_PROJECT_NAME $TARGET_BRANCH
}

# Split execution mode: fires TWO separate CodeBuild batches against the SAME
# amplify-category-api-e2e-workflow project, each via --buildspec-override:
#   Batch A ("api+gql"): codebuild_specs/e2e_workflow_api_gql.yml
#   Batch B ("cdk"):     codebuild_specs/e2e_workflow_cdk.yml
# Each batch is self-contained (carries the full prep/build chain) and independently waved, so each
# stays under the orchestrator's in-flight ceiling. The combined-batch cloudE2E above is untouched.
# Use the two printed Batch IDs with 'yarn wait-for-all-codebuild-split <idA> <idB>' to poll aggregate
# pass/fail.
function cloudE2ESplit {
    echo Running Prod E2E Test Suite in SPLIT mode "(separate api+gql and cdk batches)"
    E2E_ROLE_NAME=CodebuildDeveloper
    E2E_PROFILE_NAME=AmplifyAPIE2EProd
    E2E_PROJECT_NAME=amplify-category-api-e2e-workflow
    TARGET_BRANCH=$CURR_BRANCH
    echo "--- Triggering api+gql batch ---"
    triggerProjectBatchWithBuildspec $E2E_ACCOUNT_PROD $E2E_ROLE_NAME $E2E_PROFILE_NAME $E2E_PROJECT_NAME $TARGET_BRANCH codebuild_specs/e2e_workflow_api_gql.yml
    echo "--- Triggering cdk batch ---"
    triggerProjectBatchWithBuildspec $E2E_ACCOUNT_PROD $E2E_ROLE_NAME $E2E_PROFILE_NAME $E2E_PROJECT_NAME $TARGET_BRANCH codebuild_specs/e2e_workflow_cdk.yml
    echo "Both batches triggered. Use the two Batch IDs printed above with 'yarn wait-for-all-codebuild-split <apiGqlBatchId> <cdkBatchId>' to poll aggregate pass/fail."
}

function cloudE2EDebug {
    if [ $# -eq 0 ]; then
        echo "Please provide the batch build id of codebuild"
        exit 1
    fi
    if [ "$1" == "--use-existing-debug-spec" ]; then
        echo "Using existing debug spec"
    else
        echo "Generating debug spec for provided batch build id"
        generatedDebugSpecForFailedTests $1
    fi
    echo Running Prod E2E Test Suite
    E2E_ROLE_NAME=CodebuildDeveloper
    E2E_PROFILE_NAME=AmplifyAPIE2EProd
    E2E_PROJECT_NAME=amplify-category-api-e2e-workflow
    TARGET_BRANCH=$CURR_BRANCH
    triggerProjectBatchWithDebugSession $E2E_ACCOUNT_PROD $E2E_ROLE_NAME $E2E_PROFILE_NAME $E2E_PROJECT_NAME $TARGET_BRANCH
}

function generatedDebugSpecForFailedTests {
    # Get temporary access for the account
    E2E_ROLE_NAME=CodebuildDeveloper
    E2E_PROFILE_NAME=AmplifyAPIE2EProd
    authenticate $E2E_ACCOUNT_PROD $E2E_ROLE_NAME "$E2E_PROFILE_NAME"
    local batch_build_id=$1
    echo "Getting failed test suites"
    failed_tests=$(aws codebuild batch-get-build-batches --profile="$E2E_PROFILE_NAME" --ids "$batch_build_id" --region us-east-1 --query 'buildBatches[0].buildGroups' | jq -c '.[] | select(.currentBuildSummary.buildStatus == "FAILED").identifier')
    if [ -z "$failed_tests" ]; then
        echo "No failed tests found in batch $1"
        exit 0
    fi
    echo $failed_tests | xargs yarn ts-node ./scripts/split-e2e-tests.ts --debug
}

function cleanupStaleResourcesBeta {
    echo Running Beta E2E resource stale resource cleanup
    CLEANUP_ROLE_NAME=CodebuildDeveloper
    CLEANUP_PROFILE_NAME=AmplifyAPIE2EBeta
    CLEANUP_PROJECT_NAME=amplify-category-api-cleanup-workflow
    TARGET_BRANCH=$CURR_BRANCH
    triggerProject $E2E_ACCOUNT_BETA $CLEANUP_ROLE_NAME $CLEANUP_PROFILE_NAME $CLEANUP_PROJECT_NAME $TARGET_BRANCH
}

function cleanupStaleResources {
    echo Running Prod E2E resource stale resource cleanup
    CLEANUP_ROLE_NAME=CodebuildDeveloper
    CLEANUP_PROFILE_NAME=AmplifyAPIE2EProd
    CLEANUP_PROJECT_NAME=amplify-category-api-cleanup-workflow
    TARGET_BRANCH=$CURR_BRANCH
    triggerProject $E2E_ACCOUNT_PROD $CLEANUP_ROLE_NAME $CLEANUP_PROFILE_NAME $CLEANUP_PROJECT_NAME $TARGET_BRANCH
}

function authenticateWithE2EProfile {
    E2E_ROLE_NAME=CodebuildDeveloper
    E2E_PROFILE_NAME=AmplifyAPIE2EProd
    authenticate $E2E_ACCOUNT_PROD $E2E_ROLE_NAME $E2E_PROFILE_NAME
}
