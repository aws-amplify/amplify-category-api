#!/bin/bash
source ./scripts/cloud-utils.sh
export RELEASE_ROLE_NAME=CodebuildDeveloper
export RELEASE_PROFILE_NAME=AmplifyAPIPluginRelease
export RELEASE_PROJECT_NAME=amplify-category-api-release-workflow

function triggerRelease {
  if [ -z "$1" ]
  then
    branch_name=$(git branch --show-current)
  else
    branch_name=$1
  fi
  echo "Running release workflow from branch ${branch_name}"
  triggerProjectBatch $RELEASE_ACCOUNT_PROD $RELEASE_ROLE_NAME "${RELEASE_PROFILE_NAME}Prod" $RELEASE_PROJECT_NAME $branch_name
}
