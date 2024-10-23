set -xeo pipefail
# extract the PR number from the PR link
PR_NUM=${CODEBUILD_WEBHOOK_TRIGGER##*/}
PROJECT_USERNAME=aws-amplify
REPO_NAME=amplify-category-api

if [ -z "$PR_NUM" ]; then
  echo "Could not determine PR number. Cannot determine fork point for linting. Skipping linting."
  exit
fi

export NODE_OPTIONS=--max-old-space-size=4096

# get PR file list, filter out removed files, filter only JS/TS files, then pass to the linter
# The linter will print the errors but the build will still pass.
# This is intentional because we have thousands of lint errors that will require a separate effort to resolve
curl -fsSL https://api.github.com/repos/$PROJECT_USERNAME/$REPO_NAME/pulls/$PR_NUM/files | jq -r '.[] | select(.status!="removed") | .filename' | grep -E '\.(js|jsx|ts|tsx)$' | xargs yarn eslint || true
set +x
