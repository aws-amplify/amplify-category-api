#!/bin/bash -e

scriptDir=$(dirname -- "$(readlink -f -- "$BASH_SOURCE")")
source $scriptDir/.env set
source $scriptDir/cloud-utils.sh

printf 'What is your PR number ? '
read PR_NUMBER

profile=AmplifyAPIE2EProd
authenticate "$E2E_ACCOUNT_PROD" CodebuildDeveloper "$profile"
RESULT=$(aws codebuild start-build-batch \
--profile="$profile" \
--region us-east-1 \
--project-name amplify-category-api-pr-workflow \
--build-timeout-in-minutes-override 180 \
--source-version "pr/$PR_NUMBER" \
--debug-session-enabled \
--git-clone-depth-override=1000 \
--environment-variables-override name=AMPLIFY_CI_MANUAL_PR_BUILD,value=true,type=PLAINTEXT \
--query 'buildBatch.id' --output text)

echo "https://us-east-1.console.aws.amazon.com/codesuite/codebuild/$E2E_ACCOUNT_PROD/projects/amplify-category-api-pr-workflow/batch/$RESULT?region=us-east-1"
