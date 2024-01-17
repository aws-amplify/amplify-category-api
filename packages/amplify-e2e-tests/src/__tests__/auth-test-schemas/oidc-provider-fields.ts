import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  type TodoPrivateContentVarious @model @auth(rules: [{ allow: private, provider: oidc }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: private, provider: oidc }, { allow: public }])
    owner: String
    authors: [String]
    group: String
    groups: [String]
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id", operations: [create, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id", operations: [update, read] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups", operations: [create, read] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "groups", provider: oidc, groupClaim: "cognito:groups", operations: [update, read] }])
  }

  type TodoOwnerContentVarious @model @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id" }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id" }, { allow: private, provider: oidc }, { allow: public }])
    owner: String
    authors: [String]
    group: String
    groups: [String]
    privateContent: String @auth(rules: [{ allow: private, provider: oidc, operations: [create, update, read] }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id", operations: [update, delete, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id", operations: [create, read] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups", operations: [update, delete, read] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "groups", provider: oidc, groupClaim: "cognito:groups", operations: [create, read] }])
  }

  type TodoCustomOwnerContentVarious @model @auth(rules: [{ allow: owner, ownerField: "author", provider: oidc, identityClaim: "user_id" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: owner, ownerField: "author", provider: oidc, identityClaim: "user_id" }, { allow: private, provider: oidc }, { allow: public }])
    author: String
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }, { allow: owner, ownerField: "author", provider: oidc, identityClaim: "user_id", operations: [delete] }])
    publicContent: String @auth(rules: [{ allow: public }, { allow: owner, ownerField: "author", provider: oidc, identityClaim: "user_id", operations: [delete] }])
    ownerContent: String @auth(rules: [{ allow: owner, ownerField: "author", provider: oidc, identityClaim: "user_id", operations: [create, delete, read] }])
  }

  type TodoCustomOwnersContentVarious @model @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id" }, { allow: private, provider: oidc }, { allow: public }])
    authors: [String]
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id", operations: [update, read] }])
  }

  type TodoAdminContentVarious @model @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }, { allow: private, provider: oidc }, { allow: public }])
    owner: String
    authors: [String]
    group: String
    groups: [String]
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id", operations: [update, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id", operations: [create, read] }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups", operations: [update, delete, read] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "groups", provider: oidc, groupClaim: "cognito:groups", operations: [create, read] }])
  }

  type TodoCustomGroupContentVarious @model @auth(rules: [{ allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups" }, { allow: private, provider: oidc }, { allow: public }])
    owner: String
    authors: [String]
    group: String
    groups: [String]
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }, { allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups", operations: [delete] }])
    publicContent: String @auth(rules: [{ allow: public }, { allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups", operations: [delete] }])
    ownerContent: String @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id", operations: [update, read] }, { allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups", operations: [delete] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id", operations: [create, read] }, { allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups", operations: [delete] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }, { allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups", operations: [delete] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "groups", provider: oidc, groupClaim: "cognito:groups", operations: [create, read] }, { allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups", operations: [delete] }])
  }

  type TodoCustomGroupsContentVarious @model @auth(rules: [{ allow: groups, groupsField: "groups", provider: oidc, groupClaim: "cognito:groups" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "groups", provider: oidc, groupClaim: "cognito:groups" }, { allow: private, provider: oidc }, { allow: public }])
    owner: String
    authors: [String]
    group: String
    groups: [String]
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id", operations: [update, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id", operations: [create, read] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "group", provider: oidc, groupClaim: "cognito:groups", operations: [update, read] }])
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema, engine);
