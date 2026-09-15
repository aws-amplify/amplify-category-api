import { Directive } from './directive';

const name = 'auth';
const definition = /* GraphQL */ `
  directive @${name}(rules: [AuthRule!]!) on OBJECT | FIELD_DEFINITION
  input AuthRule {
    allow: AuthStrategy!
    provider: AuthProvider
    identityClaim: String
    groupClaim: String
    ownerField: String
    groupsField: String
    groups: [String]
    operations: [ModelOperation]
  }
  enum AuthStrategy {
    owner
    groups
    private
    public
    custom
  }
  enum AuthProvider {
    apiKey
    iam
    identityPool
    oidc
    userPools
    function
  }
  enum ModelOperation {
    create
    update
    delete
    read
    list
    get
    sync
    listen
    search
  }
`;
const defaults = {};

export const AuthDirective: Directive = {
  name,
  definition,
  defaults,
};
