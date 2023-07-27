#!/bin/bash
source ./scripts/cloud-utils.sh
export RELEASE_ROLE_NAME=CodebuildDeveloper
export RELEASE_PROFILE_NAME=AmplifyAPIPluginRelease
export RELEASE_PROJECT_NAME=amplify-category-api-release-workflow

function triggerRelease {
  echo "Running release workflow from branch ${branch_name}"
  triggerProjectBatch $RELEASE_ACCOUNT_PROD $RELEASE_ROLE_NAME "${RELEASE_PROFILE_NAME}Prod" $RELEASE_PROJECT_NAME "release"
}

function triggerTagRelease {
  branch_name=$(git branch --show-current)
  echo "Running tag release workflow from branch ${branch_name}"

  git fetch origin
  if [ $(git rev-parse HEAD) != $(git rev-parse origin/${branch_name}) ]
  then
    echo "You have local commits on branch ${branch_name} that are not pushed to origin. Push them before running the tag release workflow."
    exit 1
  fi
  triggerProjectBatch $RELEASE_ACCOUNT_PROD $RELEASE_ROLE_NAME "${RELEASE_PROFILE_NAME}Prod" $RELEASE_PROJECT_NAME $branch_name
}
