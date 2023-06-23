#!/bin/bash -e

if [ -z "$BRANCH_NAME" ]; then
  echo "BRANCH_NAME is missing"
  exit 1
else
  git checkout $BRANCH_NAME
  yarn install
  git restore .
fi

if [ -z "$GITHUB_EMAIL" ]; then
  echo "GITHUB_EMAIL is missing"
  exit 1
else
  git config --global user.email $GITHUB_EMAIL
fi

if [ -z "$GITHUB_USER" ]; then
  echo "GITHUB_USER is missing"
  exit 1
else
  git config --global user.name $GITHUB_USER
fi

if [[ "$BRANCH_NAME" =~ ^cb-tagged-release ]]; then
  if [[ "$BRANCH_NAME" =~ ^cb-tagged-release-without-e2e-tests\/.* ]]; then
      # Remove tagged-release-without-e2e-tests/
    export NPM_TAG="${BRANCH_NAME/cb-tagged-release-without-e2e-tests\//}"
  elif [[ "$BRANCH_NAME" =~ ^cb-tagged-release\/.* ]]; then
    # Remove tagged-release/
    export NPM_TAG="${BRANCH_NAME/cb-tagged-release\//}"
  fi
  if [ -z "$NPM_TAG" ]; then
    echo "Tag name is missing. Name your branch with either cb-tagged-release/<tag-name> or cb-tagged-release-without-e2e-tests/<tag-name>"
    exit 1
  fi
  echo "Publishing to NPM with tag $NPM_TAG"
  yarn publish:tag
else
  yarn publish:$BRANCH_NAME
fi