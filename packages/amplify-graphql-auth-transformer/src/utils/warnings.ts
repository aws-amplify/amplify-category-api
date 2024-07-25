import { TransformerContextProvider, TransformerLog, TransformerLogLevel } from '@aws-amplify/graphql-transformer-interfaces';
import { AccessControlMatrix } from '../accesscontrol';
import { AuthRule } from '.';

/**
 * Displays a warning when a default owner field is used and the feature flag is
 * disabled.
 */
export const defaultIdentityClaimWarning = (context: TransformerContextProvider, optionRules?: AuthRule[]): string | undefined => {
  const rules = optionRules || [];
  const usesDefaultIdentityClaim = rules.some((rule) => rule.allow === 'owner' && rule.identityClaim === undefined);

  if (usesDefaultIdentityClaim) {
    if (context.transformParameters.useSubUsernameForDefaultIdentityClaim) return;

    return (
      " WARNING: Amplify CLI will change the default identity claim from 'username' " +
      "to use 'sub::username'. To continue using only usernames, set 'identityClaim: \"username\"' on your " +
      "'owner' rules on your schema. The default will be officially switched with v9.0.0. To read " +
      'more: https://docs.amplify.aws/cli/migration/identity-claim-changes/'
    );
  }
};

/**
 * Displays a warning when a deprecated 'iam' auth provider is used in schema.
 */
export const deprecatedIAMProviderWarning = (rules: AuthRule[]): string | undefined => {
  const hasDeprecatedIAMProvider = rules.some((rule) => rule.provider === 'iam');

  if (hasDeprecatedIAMProvider) {
    return (
      "WARNING: Schema is using an @auth directive with deprecated provider 'iam'." +
      " Replace 'iam' provider with 'identityPool' provider."
    );
  }

  return undefined;
};

/**
 * Display a warning when an 'owner' has access to update their own owner field.
 * @param authModelConfig The model to ACM map we generate for the given ruleset.
 */
export const ownerCanReassignWarning = (authModelConfig: Map<string, AccessControlMatrix>): TransformerLog | undefined => {
  try {
    const ownerFieldRegExp = /(oidc|userPools):owner:(.*?):/;
    const modelsWithOwnersWhoCanEditOwnFields: Record<string, string[]> = Object.fromEntries(
      [...authModelConfig.entries()]
        .map(([model, acm]) => {
          const ownersWhoCanEditOwnValues = [...acm.getAcmPerRole().entries()]
            .map(([role, acmMap]) => {
              const match = ownerFieldRegExp.exec(role);
              const ownerFieldOrNull = match && match.length === 3 ? match[2] : null; // captured owner group will be the final returned value
              const canUpdateOwnOwnerField = ownerFieldOrNull && acmMap[ownerFieldOrNull] && acmMap[ownerFieldOrNull].update;
              const isImputedOwnerField = ownerFieldOrNull === 'owner' && !acmMap[ownerFieldOrNull];
              // ACM map doesn't appear to include generated fields, so if field is 'owner' and not in ACM map, assume full permissions
              return [ownerFieldOrNull, canUpdateOwnOwnerField || isImputedOwnerField];
            })
            .filter(([_, canUpdateOwnOwnerField]) => canUpdateOwnOwnerField)
            .map(([role]) => role);

          return [model, ownersWhoCanEditOwnValues];
        })
        .filter(([_, ownersWhoCanEditOwnValues]) => ownersWhoCanEditOwnValues.length > 0),
    );

    if (Object.keys(modelsWithOwnersWhoCanEditOwnFields).length === 0) return;

    const perModelWarning = Object.entries(modelsWithOwnersWhoCanEditOwnFields)
      .map(([model, roles]) => `${model}: [${roles.join(', ')}]`)
      .join(', ');

    return {
      level: TransformerLogLevel.WARN,
      message:
        `WARNING: owners may reassign ownership for the following model(s) and role(s): ${perModelWarning}. ` +
        'If this is not intentional, you may want to apply field-level authorization rules to these fields. ' +
        'To read more: https://docs.amplify.aws/cli/graphql/authorization-rules/#per-user--owner-based-data-access.',
    };
  } catch (e) {
    // Error messaging should be best effort, and not impede actual functionality.
    return {
      level: TransformerLogLevel.DEBUG,
      message: `Error caught while checking whether owners have reassign permissions: ${JSON.stringify(e)}`,
    };
  }
};

export const ownerFieldCaseWarning = (ownerField: string, warningField: string, modelName: string): string => {
  return (
    `WARNING: Schema field "${warningField}" and ownerField "${ownerField}" in type ${modelName} are getting added to your schema but could be referencing the same owner field. ` +
    'If this is not intentional, you may want to change one of the fields to the correct name.\n'
  );
};
