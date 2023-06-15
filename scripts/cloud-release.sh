#!/bin/bash
source ./scripts/cloud-utils.sh
export RELEASE_ROLE_NAME=CodebuildRelease
export RELEASE_PROFILE_NAME=AmplifyAPIPluginRelease
export RELEASE_PROJECT_NAME=Release

function release {
  branch_name=$(git branch --show-current)
  echo "Running release workflow from branch ${branch_name}"
  triggerProjectBatch $RELEASE_ACCOUNT_PROD $RELEASE_ROLE_NAME "${RELEASE_PROFILE_NAME}Prod" $RELEASE_PROJECT_NAME $branch_name
}
