#!/bin/bash -e

scriptDir=$(dirname -- "$(readlink -f -- "$BASH_SOURCE")")
source $scriptDir/.env set
source $scriptDir/cloud-utils.sh

CURR_BRANCH=$(git branch --show-current)

profile=AmplifyAPIE2EProd
authenticate "$E2E_ACCOUNT_PROD" CodebuildDeveloper "$profile"
RESULT=$(aws codebuild start-build-batch \
--profile="$profile" \
--region us-east-1 \
--project-name amplify-category-api-canary-workflow \
--source-version "$CURR_BRANCH" \
--environment-variables-override name=BRANCH_NAME,value=$CURR_BRANCH,type=PLAINTEXT \
--query 'buildBatch.id' --output text)

echo "https://us-east-1.console.aws.amazon.com/codesuite/codebuild/$E2E_ACCOUNT_PROD/projects/amplify-category-api-canary-workflow/batch/$RESULT?region=us-east-1"
