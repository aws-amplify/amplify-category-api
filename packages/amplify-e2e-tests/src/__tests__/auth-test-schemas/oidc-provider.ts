import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  type TodoPrivate @model @auth(rules: [{ allow: private, provider: oidc }]) {
    id: ID!
    content: String
  }

  type TodoOwner @model @auth(rules: [{ allow: owner, provider: oidc, identityClaim: "user_id" }]) {
    id: ID!
    content: String
    owner: String
  }

  type TodoOwnerFieldString @model @auth(rules: [{ allow: owner, ownerField: "author", provider: oidc, identityClaim: "user_id" }]) {
    id: ID!
    content: String
    author: String
  }

  type TodoOwnerFieldList @model @auth(rules: [{ allow: owner, ownerField: "authors", provider: oidc, identityClaim: "user_id" }]) {
    id: ID!
    content: String
    authors: [String]
  }

  type TodoStaticGroup @model @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "user_groups" }]) {
    id: ID!
    content: String
  }

  type TodoGroupFieldString @model @auth(rules: [{ allow: groups, groupsField: "groupField", provider: oidc, groupClaim: "user_groups" }]) {
    id: ID!
    content: String
    groupField: String
  }

  type TodoGroupFieldList @model @auth(rules: [{ allow: groups, groupsField: "groupsField", provider: oidc, groupClaim: "user_groups" }]) {
    id: ID!
    content: String
    groupsField: [String]
  }

  type Query {
    customGetTodoPrivate(id: ID!): [TodoPrivate] @sql(statement: "SELECT * FROM TodoPrivate WHERE id = :id") @auth(rules: [{ allow: private }])
    customGetTodoStaticGroup(id: ID!): [TodoStaticGroup] @sql(statement: "SELECT * FROM TodoStaticGroup WHERE id = :id") @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "user_groups" }])
  }

  type Mutation {
    addTodoPrivate(id: ID!, content: String) @sql(statement: "INSERT INTO TodoPrivate VALUES(:id, :content)") @auth(rules: [{ allow: private }])
    addTodoStaticGroup(id: ID!, content: String) @sql(statement: "INSERT INTO TodoStaticGroup VALUES(:id, :content)") @auth(rules: [{ allow: groups, groups: ["Admin"], provider: oidc, groupClaim: "user_groups" }])
  }
`;

export const sqlCreateStatements = generateDDL(schema);
