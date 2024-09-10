#!/bin/bash
source ./scripts/cloud-utils.sh
export RELEASE_ROLE_NAME=CodebuildDeveloper
export RELEASE_PROFILE_NAME=AmplifyAPIPluginRelease
export RELEASE_PROJECT_NAME=amplify-category-api-release-workflow
export DEPRECATE_PROJECT_NAME=amplify-category-api-deprecate-workflow

function triggerRelease {
  branch_name=$(git branch --show-current)
  if isReleaseBranch "$branch_name"; then
    echo "Running release workflow from branch ${branch_name}"
    triggerProjectBatch $RELEASE_ACCOUNT_PROD $RELEASE_ROLE_NAME "${RELEASE_PROFILE_NAME}Prod" $RELEASE_PROJECT_NAME $branch_name
  else
    echo "The release workflow can only be triggered from a release branch."
  fi
}

function triggerPostPublish {
  branch_name=$(git branch --show-current)
  if isReleaseBranch "$branch_name"; then
    echo "Running release workflow from branch ${branch_name}"
    triggerProjectBatchWithEnvOverrides $RELEASE_ACCOUNT_PROD $RELEASE_ROLE_NAME "${RELEASE_PROFILE_NAME}Prod" $RELEASE_PROJECT_NAME $branch_name \
    name=RUN_POST_PUBLISH_ONLY,value=\""true\"",type=PLAINTEXT
  else
    echo "The post publish workflow can only be triggered from a release branch."
  fi
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

function deprecateRelease {
  DEPRECATION_MESSAGE=$1
  SEARCH_FOR_RELEASE_STARTING_FROM=$2
  USE_NPM_REGISTRY=$3
  branch_name=$(git branch --show-current)
  if isReleaseBranch "$branch_name"; then
    echo "Running deprecate release workflow from branch ${branch_name}"
    triggerProjectBatchWithEnvOverrides $RELEASE_ACCOUNT_PROD $RELEASE_ROLE_NAME "${RELEASE_PROFILE_NAME}Prod" $DEPRECATE_PROJECT_NAME $branch_name \
    name=DEPRECATION_MESSAGE,value=\""$DEPRECATION_MESSAGE"\",type=PLAINTEXT \
    name=SEARCH_FOR_RELEASE_STARTING_FROM,value=$SEARCH_FOR_RELEASE_STARTING_FROM,type=PLAINTEXT \
    name=USE_NPM_REGISTRY,value=$USE_NPM_REGISTRY,type=PLAINTEXT
  else
    echo "The deprecate release workflow can only be triggered from a release branch."
  fi
}

# Releases branches are prefixed with "release"
function isReleaseBranch {
  branch_name=$1
  if [[ $branch_name == release* ]]; then
    return 0
  else
    return 1
  fi
}
