#!/bin/bash -e

REGISTRY="https://registry.npmjs.org"
PACKAGE_NAME="amplify-category-api"
NEW_TAG="latest"
RETRIES=30
DELAY=60 # 1 minute delay between retries

# Read package name and version from package.json
PACKAGE_MANIFEST_PATH="packages/$PACKAGE_NAME/package.json"
PACKAGE_NAME=$(jq -r '.name' "$PACKAGE_MANIFEST_PATH")
PACKAGE_VERSION=$(jq -r '.version' "$PACKAGE_MANIFEST_PATH")

# Validate package name and version
if [ -z "$PACKAGE_NAME" ] || [ -z "$PACKAGE_VERSION" ]; then
  echo "Unable to read package name or version from package.json."
  exit 1
fi
echo "Using package: $PACKAGE_NAME, version: $PACKAGE_VERSION"

# Sets the "NEW_TAG" tag to the specified version
update_dist_tag() {
  # Check if the version is available on npm
  if npm view $PACKAGE_NAME@$PACKAGE_VERSION > /dev/null 2>&1; then
    echo "Version $PACKAGE_VERSION of package $PACKAGE_NAME is available."
    # Add the dist-tag
    npm dist-tag add $PACKAGE_NAME@$PACKAGE_VERSION $NEW_TAG --registry $REGISTRY
    return $?
  else
    echo "Version $PACKAGE_VERSION of package $PACKAGE_NAME is not available yet."
    return 1
  fi
}

# Retry loop
for (( i=1; i<=$RETRIES; i++ ))
do
  echo "Attempt $i to update dist-tag..."
  if update_dist_tag; then
    echo "Successfully updated the $NEW_TAG tag to version $PACKAGE_VERSION."
    exit 0
  else
    echo "Failed to update dist-tag. Retrying in $DELAY seconds..."
    sleep $DELAY
  fi
done

echo "Failed to update the dist-tag after $RETRIES attempts."
exit 1
