import { Arn, ArnFormat } from 'aws-cdk-lib/core';

export const getAccountFromArn = (arn?: string, arnFormat: ArnFormat = ArnFormat.SLASH_RESOURCE_NAME): string | undefined => {
  if (!arn) {
    return undefined;
  }

  const components = Arn.split(arn, arnFormat);

  return components.account;
};
