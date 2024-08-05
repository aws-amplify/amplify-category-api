import { $TSContext } from '@aws-amplify/amplify-cli-core';
import { notifyFieldAuthSecurityChange, notifyListQuerySecurityChange, notifySecurityEnhancement } from './auth-notifications';

/**
 * Extracted data force update logic from the `push` command in CLI.
 * Runs through expected force updates in order.
 */
export const checkForcedUpdates = async (context: $TSContext): Promise<void> => {
  await notifySecurityEnhancement(context);

  /**
   * The following two checks use similar phrasing for the customer. This isn't ideal moving forward, but
   * leaving these two as-is since they were added in CLI version 7.6.19.
   */
  let securityChangeNotified = false;
  securityChangeNotified = await notifyFieldAuthSecurityChange(context);

  if (!securityChangeNotified) {
    securityChangeNotified = await notifyListQuerySecurityChange(context);
  }
};
