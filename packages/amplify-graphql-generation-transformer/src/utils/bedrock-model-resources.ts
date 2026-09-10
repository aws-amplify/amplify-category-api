/**
 * Cross-region inference profile prefixes. When an aiModel id begins with one of
 * these, Bedrock routes `InvokeModel` through an account-scoped inference-profile
 * ARN rather than the bare foundation-model ARN, so the IAM policy must grant the
 * inference-profile resource in addition to the underlying foundation model(s).
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html
 */
const INFERENCE_PROFILE_PREFIXES = ['global.', 'us.', 'eu.', 'apac.', 'ap.'];

const matchedInferenceProfilePrefix = (bedrockModelId: string): string | undefined =>
  INFERENCE_PROFILE_PREFIXES.find((prefix) => bedrockModelId.startsWith(prefix));

/**
 * Builds the list of IAM resource ARNs that a `bedrock:InvokeModel` grant needs
 * for a given aiModel id.
 *
 * - A plain foundation model (e.g. `anthropic.claude-3-haiku-20240307-v1:0`)
 *   only needs the regional foundation-model ARN (unchanged behavior).
 * - A cross-region inference profile id (e.g.
 *   `global.anthropic.claude-haiku-4-5-20251001-v1:0` or
 *   `us.anthropic.claude-...`) additionally needs the account-scoped
 *   inference-profile ARN and the underlying regional foundation-model ARN.
 *   For the `global.` prefix, the partition-wide foundation-model ARN is also
 *   granted to enable cross-region routing.
 *
 * This mirrors the three-part grant used by `@aws-amplify/ai-constructs` for the
 * `a.conversation()` path (see aws-amplify/amplify-backend#3162); the
 * `a.generation()` path was missing it, causing an `AccessDeniedException` at
 * runtime for newer Claude models routed through an inference profile.
 *
 * @param partition - The AWS partition (e.g. `aws`).
 * @param region - The AWS region for the Bedrock service.
 * @param account - The AWS account id.
 * @param bedrockModelId - The aiModel id from the `@generation` directive.
 * @returns The list of resource ARNs for the `bedrock:InvokeModel` policy statement.
 */
export const bedrockInvokeModelResources = (partition: string, region: string, account: string, bedrockModelId: string): string[] => {
  const prefix = matchedInferenceProfilePrefix(bedrockModelId);

  if (!prefix) {
    return [`arn:${partition}:bedrock:${region}::foundation-model/${bedrockModelId}`];
  }

  const foundationModelId = bedrockModelId.slice(prefix.length);

  const resources = [
    // The inference profile the request is actually routed through.
    `arn:${partition}:bedrock:${region}:${account}:inference-profile/${bedrockModelId}`,
    // The underlying foundation model in the requesting region.
    `arn:${partition}:bedrock:${region}::foundation-model/${foundationModelId}`,
  ];

  // Global profiles can route to any region, so grant the partition-wide model too.
  if (prefix === 'global.') {
    resources.push(`arn:${partition}:bedrock:::foundation-model/${foundationModelId}`);
  }

  return resources;
};
