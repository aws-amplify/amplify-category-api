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
    echo Authenticating terminal...
    mwinit --aea
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
    RESULT=$(aws codebuild start-build-batch --profile="${profile_name}" --project-name $project_name --source-version=$target_branch \
     --environment-variables-override name=BRANCH_NAME,value=$target_branch,type=PLAINTEXT \
     --query 'buildBatch.id' --output text)
    echo "https://$REGION.console.aws.amazon.com/codesuite/codebuild/$account_number/projects/$project_name/batch/$RESULT?region=$REGION"
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
    TARGET_BRANCH=run-cb-e2e/$USER/$CURR_BRANCH
    git push $(git remote -v | grep aws-amplify/amplify-category-api | head -n1 | awk '{print $1;}') $CURR_BRANCH:$TARGET_BRANCH --no-verify --force-with-lease
    triggerProjectBatch $E2E_ACCOUNT_PROD $E2E_ROLE_NAME $E2E_PROFILE_NAME $E2E_PROJECT_NAME $TARGET_BRANCH
}
