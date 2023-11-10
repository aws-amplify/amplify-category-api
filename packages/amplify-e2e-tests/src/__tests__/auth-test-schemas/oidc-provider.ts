import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  type TodoPrivate @model @auth(rules: [{ allow: private, provider: oidc }]) {
    id: ID! @primaryKey
    content: String
  }

  type TodoOwner @model @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id" }]) {
    id: ID! @primaryKey
    content: String
    owner: String
  }

  type TodoOwnerFieldString @model @auth(rules: [{ allow: owner, ownerField: "author", provider: oidc, identityClaim: "user_id" }]) {
    id: ID! @primaryKey
    content: String
    author: String
  }

  type TodoOwnerFieldList @model @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id" }]) {
    id: ID! @primaryKey
    content: String
    authors: [String]
  }

  type TodoStaticGroup @model @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }]) {
    id: ID! @primaryKey
    content: String
  }

  type TodoGroupFieldString @model @auth(rules: [{ allow: groups, groupsField: "groupField", provider: oidc, groupClaim: "cognito:groups" }]) {
    id: ID! @primaryKey
    content: String
    groupField: String
  }

  type TodoGroupFieldList @model @auth(rules: [{ allow: groups, groupsField: "groupsField", provider: oidc, groupClaim: "cognito:groups" }]) {
    id: ID! @primaryKey
    content: String
    groupsField: [String]
  }

  type TodoNonModel {
    id: ID,
    content: String
  }

  type Query {
    customGetTodoPrivate(id: ID!): [TodoNonModel] @sql(statement: "SELECT * FROM TodoPrivate WHERE id = :id") @auth(rules: [{ allow: private, provider: oidc }])
    customGetTodoStaticGroup(id: ID!): [TodoNonModel] @sql(statement: "SELECT * FROM TodoStaticGroup WHERE id = :id") @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }])
  }

  type Mutation {
    addTodoPrivate(id: ID!, content: String): TodoNonModel @sql(statement: "INSERT INTO TodoPrivate VALUES(:id, :content)") @auth(rules: [{ allow: private, provider: oidc }])
    addTodoStaticGroup(id: ID!, content: String): TodoNonModel @sql(statement: "INSERT INTO TodoStaticGroup VALUES(:id, :content)") @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "cognito:groups" }])
  }
`;

export const sqlCreateStatements = generateDDL(schema);
