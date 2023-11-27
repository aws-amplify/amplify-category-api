#!/bin/bash

if [[ -z "$AWS_ACCESS_KEY_ID" ]] ; then
  echo "Could not find AWS_ACCESS_KEY_ID in environment" >&2
  exit 1
fi

if [[ -z "$AWS_SECRET_ACCESS_KEY" ]] ; then
  echo "Could not find AWS_SECRET_ACCESS_KEY in environment" >&2
  exit 1
fi

if [[ -z "$AWS_REGION" ]] ; then
  echo "Could not find AWS_REGION in environment" >&2
  exit 1
fi


if [[ -n "$AWS_SESSION_TOKEN" ]] ; then
  AWS_SESSION_TOKEN_LINE="AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN"
fi

cat <<EOF > .env
# Used for setting up a new profile
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
$AWS_SESSION_TOKEN_LINE

CLI_REGION=$AWS_REGION

# Used for Auth Hosted UI
FACEBOOK_APP_ID=fbAppId
FACEBOOK_APP_SECRET=fbAppSecret

GOOGLE_APP_ID=gglAppID
GOOGLE_APP_SECRET=gglAppSecret

AMAZON_APP_ID=amaznAppID
AMAZON_APP_SECRET=amaznAppSecret

# the following keys are invalidated but they pass Cognito validation
APPLE_APP_ID=com.fake.app
APPLE_TEAM_ID=2QLEWNDK6K
APPLE_KEY_ID=2QLZXKYJ8J
APPLE_PRIVATE_KEY=MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgIltgNsTgTfSzUadYiCS0VYtDDMFln/J8i1yJsSIw5g+gCgYIKoZIzj0DAQehRANCAASI8E0L/DhR/mIfTT07v3VwQu6q8I76lgn7kFhT0HvWoLuHKGQFcFkXXCgztgBrprzd419mUChAnKE6y89bWcNw
EOF

echo "Wrote .env"
