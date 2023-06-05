import { $TSContext, CloudformationProviderFacade } from '@aws-amplify/amplify-cli-core';

/**
 *
 * @param context
 */
export async function hasApiKey(context: $TSContext): Promise<boolean> {
  const apiKeyConfig = await CloudformationProviderFacade.getApiKeyConfig(context);
  return !!apiKeyConfig && !!apiKeyConfig?.apiKeyExpirationDays;
}
