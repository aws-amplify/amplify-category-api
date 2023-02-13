#!/bin/bash

REPO_NAME=amplify-cli
REPO_URL="git@github.com:aws-amplify/$REPO_NAME.git"
GIT_USER_NAME="amplify-data-dev-git"
GIT_USER_EMAIL="amplify-data-dev+github@amazon.com"
FEATURE_BRANCH=guest/data/update-data-packages
BASE_BRANCH=dev
COMMIT_MESSAGE="chore: bump API plugin dependencies"
PR_BODY="
#### Description of changes
- Bump the API and Codegen plugin dependencies to latest versions.

#### Issue #, if available
None

#### Description of how you validated changes
Build and Unit test jobs run successfully.

#### Checklist

- [x] PR description included
- [x] 'yarn test' passes

By submitting this pull request, I confirm that my contribution is made under the terms of the Apache 2.0 license.
"

# Create a temporary directory
tmp_dir=$(mktemp -d)
curr_dir=$pwd
echo "Current Directory: $curr_dir"
cd $tmp_dir
echo "Current Temp Directory: $tmp_dir"

# Clone the CLI repo
git clone $REPO_URL --depth 1
cd $REPO_NAME

# Checkout the feature branch to be used for version bumps
if git show-ref --quiet refs/heads/$FEATURE_BRANCH; then
  git branch -D $FEATURE_BRANCH # Delete if already exists locally
fi
git checkout -b $FEATURE_BRANCH

# Pull latest changes from remote if any
git pull

# Bump the versions locally
yarn update-data-packages

# Stage and commit the files
git status
git config user.name "'$GIT_USER_NAME'"
git config user.email "'$GIT_USER_EMAIL'"
git add yarn.lock
git add packages/*/package.json
git commit -m "'$COMMIT_MESSAGE'"

# Sanity check the version bump changes before pushing
yarn build && yarn test

# Push to upstream
git push --set-upstream origin $FEATURE_BRANCH

# Create a PR to dev branch of CLI
gh pr create --base $BASE_BRANCH --head $FEATURE_BRANCH --title "'$COMMIT_MESSAGE'" --body "'$PR_BODY'"
