import { InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { GenerationDirectiveConfiguration } from './grapqhl-generation-transformer';
import { isQueryType } from '@aws-amplify/graphql-transformer-core/src/utils';

/**
 * Validates the configuration for the `@generation` directive.
 *
 * This function performs validation checks on the provided configuration
 * to ensure it meets the requirements for the `@generation` directive.
 *
 * @param {GenerationDirectiveConfiguration} config - The configuration object for the `@generation` directive.
 * @param {TransformerContextProvider} ctx - The transformer context provider.
 * @throws {InvalidDirectiveError} If the configuration is invalid.
 */

export const validate = (config: GenerationDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  validateFieldType(config);
  validateInferenceConfig(config);
};

/**
 * Validates the field type for the `@generation` directive.
 *
 * This function checks if the parent of the field with the `@generation` directive
 * is of type 'Query'. If not, it throws an InvalidDirectiveError.
 *
 * @param {GenerationDirectiveConfiguration} config - The configuration object for the `@generation` directive.
 * @throws {InvalidDirectiveError} If the parent is not of type 'Query'.
 */
const validateFieldType = (config: GenerationDirectiveConfiguration): void => {
  const { parent } = config;
  if (!isQueryType(parent.name.value)) {
    throw new InvalidDirectiveError('@generation directive must be used on Query field.');
  }
};

/**
 * Validates the inference configuration for the `@generation` directive according to the Bedrock API docs.
 * {@link https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InferenceConfiguration.html}
 * @param config The generation directive configuration to validate.
 */
const validateInferenceConfig = (config: GenerationDirectiveConfiguration): void => {
  if (!config.inferenceConfiguration) {
    return;
  }

  const { maxTokens, temperature, topP } = config.inferenceConfiguration;

  // dealing with possible 0 values, so we check for undefined.
  if (maxTokens !== undefined && maxTokens < 1) {
    throw new InvalidDirectiveError(`@generation directive maxTokens valid range: Minimum value of 1. Provided: ${maxTokens}`);
  }

  if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
    throw new InvalidDirectiveError(
      `@generation directive temperature valid range: Minimum value of 0. Maximum value of 1. Provided: ${temperature}`,
    );
  }

  if (topP !== undefined && (topP < 0 || topP > 1)) {
    throw new InvalidDirectiveError(`@generation directive topP valid range: Minimum value of 0. Maximum value of 1. Provided: ${topP}`);
  }
};
