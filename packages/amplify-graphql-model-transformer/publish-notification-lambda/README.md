# RDS Publish Notification Lambda

## Overview

The purpose of this lambda is to publish a message in the configured SNS Topic to let customers know that there is a new RDS Lambda Layer version is available.

### Setup Instructions

Lambda code resides in a zip file `packages/amplify-graphql-model-transformer/lib/rds-patching-lambda.zip`.

1. Create a new lambda function in the service account.
2. Upload the zip file to update the code.
3. Increase the function timeout to 1 minute.
4. Set the environment variables `LAYER_NAME`, `SNS_TOPIC_ARN` and `SNS_TOPIC_REGION`. LAYER_NAME refers to the RDS Lambda Layer name.
5. Add the below polices to the lambda's execution role.
6. To notify customers, run the lambda with empty input `{}`.

#### Required Lambda Policies

```json
{
  "Effect": "Allow",
  "Action": [
      "sns:Publish"
  ],
  "Resource": [
      "<<REPLACE_WITH_SNS_TOPIC_ARN>>"
  ]
},
{
  "Effect": "Allow",
  "Action": [
      "lambda:ListLayerVersions"
  ],
  "Resource": [
      "*"
  ]
}
```
