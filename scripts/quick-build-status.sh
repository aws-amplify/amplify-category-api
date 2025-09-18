#!/bin/bash

# Quick build status checker
# Usage: ./scripts/quick-build-status.sh <buildBatchId>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <buildBatchId>"
    exit 1
fi

BATCH_ID=$1
REGION=us-east-1
PROFILE_NAME=AmplifyAPIE2EProd

# Authenticate if needed
source ./scripts/cloud-utils.sh
authenticate $E2E_ACCOUNT_PROD CodebuildDeveloper $PROFILE_NAME

echo "Checking status for batch: $BATCH_ID"
echo "=================================="

# Get batch status
aws codebuild batch-get-build-batches \
    --profile="$PROFILE_NAME" \
    --region="$REGION" \
    --ids "$BATCH_ID" \
    --query 'buildBatches[0].{
        BatchStatus: buildBatchStatus,
        TotalBuilds: length(buildGroups),
        FailedBuilds: length(buildGroups[?currentBuildSummary.buildStatus==`FAILED`]),
        SucceededBuilds: length(buildGroups[?currentBuildSummary.buildStatus==`SUCCEEDED`]),
        InProgressBuilds: length(buildGroups[?currentBuildSummary.buildStatus==`IN_PROGRESS`])
    }' \
    --output table

echo ""
echo "Failed builds:"
aws codebuild batch-get-build-batches \
    --profile="$PROFILE_NAME" \
    --region="$REGION" \
    --ids "$BATCH_ID" \
    --query 'buildBatches[0].buildGroups[?currentBuildSummary.buildStatus==`FAILED`].{
        Job: identifier,
        Status: currentBuildSummary.buildStatus
    }' \
    --output table

echo ""
echo "Console URL:"
echo "https://$REGION.console.aws.amazon.com/codesuite/codebuild/$E2E_ACCOUNT_PROD/projects/amplify-category-api-e2e-workflow/batch/$BATCH_ID?region=$REGION"
