#!/bin/bash -e

REGISTRY="https://registry.npmjs.org/"
PACKAGE_NAME="@aws-amplify/amplify-category-api"
TARGET_TAG="stable-tag-4"
NEW_TAG="stable-tag-3"
RETRIES=10
DELAY=5

# Function to attempt to set the "NEW_TAG" tag to the version tagged with "TARGET_TAG"
update_dist_tag() {
  # Fetch the version tagged with "TARGET_TAG"
  version=$(npm info $PACKAGE_NAME@$TARGET_TAG version 2>&1)
  
  # Check if npm returned a 404 error
  if [ -z "$version" ] || echo "$version" | grep -q "404"; then
    echo "404 error encountered. The version might not be available yet."
    return 1
  fi
  
  echo "Found version $version tagged with $TARGET_TAG."
  # Attempt to add the dist-tag
  npm dist-tag add $PACKAGE_NAME@$version $NEW_TAG
  return $? # Return success or failure based on the npm command
}

npm set registry "$REGISTRY"
yarn config set registry "$REGISTRY"

# Retry loop
for (( i=1; i<=$RETRIES; i++ ))
do
  echo "Attempt $i to update dist-tag..."
  if update_dist_tag; then
    echo "Successfully updated the $NEW_TAG tag to version $version."
    exit 0
  else
    echo "Failed to update dist-tag. Retrying in $DELAY seconds..."
    sleep $DELAY
  fi
done

echo "Failed to update the dist-tag after $RETRIES attempts."
exit 1
