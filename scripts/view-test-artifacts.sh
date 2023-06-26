#!/bin/bash

source ./scripts/cloud-utils.sh

function downloadS3Artifact {
  # Get temporary access for the account
  E2E_ROLE_NAME=CodebuildDeveloper
  E2E_PROFILE_NAME=AmplifyAPIE2EProd
  authenticate $E2E_ACCOUNT_PROD $E2E_ROLE_NAME "$E2E_PROFILE_NAME"

  local s3_object_uri=$1
  local destination_dir=$2

  echo "Downloading objects from S3 bucket..."
  aws s3 cp "$s3_object_uri" "$destination_dir" --recursive --profile="$E2E_PROFILE_NAME"
  echo "Download complete. Files are saved in: $destination_dir"
}

function playTestArtifact {
  # Check if an S3 object URI is provided
  if [ $# -eq 0 ]; then
    echo "Provide the S3 URI of the artifact: $0 <s3_object_uri>"
    exit 1
  fi

  local s3_object_uri=$1
  local temp_dir=$(mktemp -d) # Create a temporary directory

  trap "cleanup $temp_dir" SIGINT SIGTERM # Register cleanup function to handle Ctrl+C

  echo "Starting test artifact playback..."
  downloadS3Artifact "$s3_object_uri" "$temp_dir"

  
  local subfolders=("$temp_dir"/*/)
  if [ ${#subfolders[@]} -eq 1 ]; then
    cd "${subfolders[0]}" || exit 1
  else
    cd "$temp_dir" || exit 1
  fi

  # Spin up a local HTTP server
  echo "Starting local HTTP server from directory $(pwd)..."
  npx http-server -p 0

  cleanup "$temp_dir"
}

function cleanup {
  echo "Cleaning up and deleting the temporary directory..."
  rm -rf "$1"
  echo "Temporary directory deleted. Exiting script."
}

playTestArtifact "$@"
