#!/bin/bash -e

scriptDir=$(dirname -- "$(readlink -f -- "$BASH_SOURCE")")
source $scriptDir/.env set

CURR_BRANCH=$(git branch --show-current)

if [[ -n $USE_FIDO_KEY ]] ; then
  mwinit -s -f
else
  mwinit
fi

ada cred update --profile=AmplifyAPIE2EProd --account=$E2E_ACCOUNT_PROD --role=CodebuildDeveloper --provider=isengard --once
RESULT=$(aws codebuild start-build-batch \
--profile=AmplifyAPIE2EProd \
--region us-east-1 \
--project-name amplify-category-api-pr-workflow \
--build-timeout-in-minutes-override 180 \
--source-version "$CURR_BRANCH" \
--debug-session-enabled \
--git-clone-depth-override=1000 \
--environment-variables-override name=AMPLIFY_CI_MANUAL_PR_BUILD,value=true,type=PLAINTEXT \
--query 'buildBatch.id' --output text)

echo "https://us-east-1.console.aws.amazon.com/codesuite/codebuild/$E2E_ACCOUNT_PROD/projects/amplify-category-api-pr-workflow/batch/$RESULT?region=us-east-1"