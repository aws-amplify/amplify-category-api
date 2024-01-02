import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  type TodoPrivateContentVarious @model @auth(rules: [{ allow: private, provider: oidc }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: private, provider: oidc }, { allow: public }])
    owner: String
    authors: [String]
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [create, read], provider: oidc, identityClaim: "user_id" }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [update, read], provider: oidc, identityClaim: "user_id" }])
  }

  type TodoOwnerContentVarious @model @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id" }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id" }, { allow: private, provider: oidc }, { allow: public }])
    owner: String
    authors: [String]
    privateContent: String @auth(rules: [{ allow: private, provider: oidc, operations: [create, update, read] }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [update, delete, read], provider: oidc, identityClaim: "user_id" }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [create, read], provider: oidc, identityClaim: "user_id" }])
  }

  type TodoCustomOwnerContentVarious @model @auth(rules: [{ allow: owner, ownerField: "author", provider: oidc, identityClaim: "user_id" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: owner, ownerField: "author", provider: oidc, identityClaim: "user_id" }, { allow: private, provider: oidc }, { allow: public }])
    author: String
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }, { allow: owner, ownerField: "author", operations: [delete], provider: oidc, identityClaim: "user_id" }])
    publicContent: String @auth(rules: [{ allow: public }, { allow: owner, ownerField: "author", operations: [delete], provider: oidc, identityClaim: "user_id" }])
    ownerContent: String @auth(rules: [{ allow: owner, ownerField: "author", operations: [create, delete, read], provider: oidc, identityClaim: "user_id" }])
  }

  type TodoCustomOwnersContentVarious @model @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id" }, { allow: private, provider: oidc }, { allow: public }])
    authors: [String]
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [update, read], provider: oidc, identityClaim: "user_id" }])
  }

  type TodoAdminContentVarious @model @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }, { allow: private, provider: oidc }, { allow: public }])
    owner: String
    authors: [String]
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id" }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id" }])
  }

  type TodoCustomGroupContentVarious @model @auth(rules: [{ allow: groups, groupsField: "customGroup", provider: oidc, groupClaim: "cognito:groups" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "customGroup", provider: oidc, groupClaim: "cognito:groups" }, { allow: private, provider: oidc }, { allow: public }])
    owner: String
    authors: [String]
    customGroup: String
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id" }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id" }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }])
  }

  type TodoCustomGroupsContentVarious @model @auth(rules: [{ allow: groups, groupsField: "customGroups", provider: oidc, groupClaim: "cognito:groups" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "customGroups", provider: oidc, groupClaim: "cognito:groups" }, { allow: private, provider: oidc }, { allow: public }])
    owner: String
    authors: [String]
    customGroups: [String]
    privateContent: String @auth(rules: [{ allow: private, provider: oidc }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id" }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id" }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }])
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema, engine);
