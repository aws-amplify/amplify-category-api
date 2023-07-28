#!/bin/bash

source ./scripts/cloud-utils.sh

function generatedDebugSpecForFailedTests {
  # Check if an batch build name is provided
  if [ $# -eq 0 ]; then
    echo "Please provide the batch build id of codebuild"
    exit 1
  fi
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
  echo $failed_tests | xargs yarn ts-node ./scripts/split-e2e-tests-codebuild.ts --debug
  echo ""
  echo "Next steps:"
  echo "- add 'codebuild-breakpoint' to desired location in build specs or shared scripts"
  echo "- git commit and push your changes"
  echo "- run command 'yarn cloud-e2e-debug'"
}

generatedDebugSpecForFailedTests "$@"

