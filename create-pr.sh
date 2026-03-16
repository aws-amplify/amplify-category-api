#!/usr/bin/env bash
set -euo pipefail

# GitHub Device Flow OAuth - creates a temporary token and opens a PR
CLIENT_ID="178c6fc778ccc68e1d6a"  # GitHub CLI's official client_id

echo "🔐 Requesting GitHub device authorization..."
DEVICE_RESPONSE=$(curl -s -X POST https://github.com/login/device/code \
  -H "Accept: application/json" \
  -d "client_id=${CLIENT_ID}&scope=repo")

DEVICE_CODE=$(echo "$DEVICE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['device_code'])")
USER_CODE=$(echo "$DEVICE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['user_code'])")
VERIFY_URL=$(echo "$DEVICE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['verification_uri'])")
INTERVAL=$(echo "$DEVICE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['interval'])")

echo ""
echo "👉 Go to: ${VERIFY_URL}"
echo "👉 Enter code: ${USER_CODE}"
echo ""
echo "Waiting for authorization..."

# Poll for token
while true; do
  sleep "$INTERVAL"
  TOKEN_RESPONSE=$(curl -s -X POST https://github.com/login/oauth/access_token \
    -H "Accept: application/json" \
    -d "client_id=${CLIENT_ID}&device_code=${DEVICE_CODE}&grant_type=urn:ietf:params:oauth:grant-type:device_code")

  ERROR=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', ''))" 2>/dev/null)
  TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

  if [ -n "$TOKEN" ]; then
    echo "✅ Authorized!"
    break
  elif [ "$ERROR" = "authorization_pending" ]; then
    continue
  elif [ "$ERROR" = "slow_down" ]; then
    INTERVAL=$((INTERVAL + 5))
    continue
  else
    echo "❌ Authorization failed: $ERROR"
    exit 1
  fi
done

echo "📝 Creating pull request..."

PR_BODY=$(python3 -c "
import json
body = '''## Description

Upgrades bundled \`@aws-amplify/backend-*\` dependencies to their latest versions to include the standalone deployment type support introduced in https://github.com/aws-amplify/amplify-backend/pull/3132.

### Version changes (in lockfile/bundled output)

| Package | Old | New |
|---------|-----|-----|
| \`@aws-amplify/backend-output-storage\` | 1.1.5 | 1.3.4 |
| \`@aws-amplify/plugin-types\` | 1.8.1 | 1.12.0 |
| \`@aws-amplify/platform-core\` | 1.6.5 | 1.11.0 |

### Verified
- \`DeploymentType = 'branch' | 'sandbox' | 'standalone'\` present in bundled \`plugin-types\`
- \`case 'standalone': return 'AmplifyStandalone'\` present in bundled \`backend-output-storage\`
- \`type !== 'standalone'\` guard present in bundled \`platform-core\`
- JSII build passes with 0 errors, 0 warnings

### Changes
- \`yarn.lock\` — selective upgrade of amplify-backend packages
- \`.jsii\` assemblies rebuilt for \`amplify-graphql-api-construct\` and \`amplify-data-construct\`'''

print(json.dumps({
    'title': 'chore: upgrade amplify-backend dependencies to latest versions',
    'head': 'chore/upgrade-amplify-backend-deps',
    'base': 'main',
    'body': body
}))
")

PR_RESULT=$(curl -s -X POST https://api.github.com/repos/aws-amplify/amplify-category-api/pulls \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -d "$PR_BODY")

PR_URL=$(echo "$PR_RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('html_url', ''))" 2>/dev/null)

if [ -n "$PR_URL" ]; then
  echo ""
  echo "✅ PR created successfully!"
  echo "🔗 ${PR_URL}"
else
  echo "❌ Failed to create PR:"
  echo "$PR_RESULT" | python3 -m json.tool 2>/dev/null || echo "$PR_RESULT"
fi
