import { Directive } from '../directive';

const name = 'auth';
const definition = /* GraphQL */ `
  directive @${name}(rules: [AuthRule!]!) on OBJECT | FIELD_DEFINITION
  input AuthRule {
    # Specifies the auth rule's strategy. Allowed values are 'owner', 'groups', 'public', 'private'.
    allow: AuthStrategy!

    # Legacy name for identityClaim
    identityField: String @deprecated(reason: "The 'identityField' argument is replaced by the 'identityClaim'.")

    # Specifies the name of the provider to use for the rule. This overrides the default provider
    # when 'public' and 'private' AuthStrategy is used. Specifying a provider for 'owner' or 'groups'
    # are not allowed.
    provider: AuthProvider

    # Specifies the name of the claim to look for on the request's JWT token
    # from Cognito User Pools (and in the future OIDC) that contains the identity
    # of the user. If 'allow' is 'groups', this value should point to a list of groups
    # in the claims. If 'allow' is 'owner', this value should point to the logged in user identity string.
    # Defaults to "cognito:username" for Cognito User Pools auth.
    identityClaim: String

    # Allows for custom config of 'groups' which is validated against the JWT
    # Specifies a static list of groups that should have access to the object
    groupClaim: String

    # Allowed when the 'allow' argument is 'owner'.
    # Specifies the field of type String or [String] that contains owner(s) that can access the object.
    ownerField: String # defaults to "owner"
    # Allowed when the 'allow' argument is 'groups'.
    # Specifies the field of type String or [String] that contains group(s) that can access the object.
    groupsField: String

    # Allowed when the 'allow' argument is 'groups'.
    # Specifies a static list of groups that should have access to the object.
    groups: [String]

    # Specifies operations to which this auth rule should be applied.
    operations: [ModelOperation]

    # Deprecated. It is recommended to use the 'operations' arguments.
    queries: [ModelQuery] @deprecated(reason: "The 'queries' argument will be replaced by the 'operations' argument in a future release.")

    # Deprecated. It is recommended to use the 'operations' arguments.
    mutations: [ModelMutation]
      @deprecated(reason: "The 'mutations' argument will be replaced by the 'operations' argument in a future release.")
  }
  enum AuthStrategy {
    owner
    groups
    private
    public
  }
  enum AuthProvider {
    apiKey
    iam
    oidc
    userPools
  }
  enum ModelOperation {
    create
    update
    delete
    read
  }
  enum ModelQuery @deprecated(reason: "ModelQuery will be replaced by the 'ModelOperation' in a future release.") {
    get
    list
  }
  enum ModelMutation @deprecated(reason: "ModelMutation will be replaced by the 'ModelOperation' in a future release.") {
    create
    update
    delete
  }
`;
const defaults = {};

export const AuthDirectiveV1: Directive = {
  name,
  definition,
  defaults,
};
