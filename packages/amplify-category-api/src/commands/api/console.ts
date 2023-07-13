import * as path from 'path';
import { $TSContext, AmplifyCategories } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';

const subcommand = 'console';

export const name = subcommand;

export const run = async (context: $TSContext) => {
  const servicesMetadata = (await import(path.join('..', '..', 'provider-utils', 'supported-services'))).supportedServices;
  const result = await context.amplify.serviceSelectionPrompt(context, AmplifyCategories.API, servicesMetadata);
  try {
    const providerController = await import(path.join('..', '..', 'provider-utils', result.providerName, 'index'));
    if (!providerController) {
      throw new Error(`Provider "${result.providerName}" is not configured for this category`);
    }
    return providerController.console(context, result.service);
  } catch (err) {
    printer.error('Error opening console.');
    throw err;
  }
};
