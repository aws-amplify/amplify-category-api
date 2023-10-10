import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  type TodoOwner @model @auth(rules: [{ allow: owner, identityClaim: "user_id" }]) {
    id: ID!
    content: String
    owner: String
  }

  type TodoOwnerFieldString @model @auth(rules: [{ allow: owner, ownerField: "author", identityClaim: "user_id" }]) {
    id: ID!
    content: String
    author: String
  }

  type TodoOwnerFieldList @model @auth(rules: [{ allow: owner, ownerField: "authors", identityClaim: "user_id" }]) {
    id: ID!
    content: String
    authors: [String]
  }

  type TodoStaticGroup @model @auth(rules: [{ allow: groups, groups: ["Admin"], groupClaim: "user_groups" }]) {
    id: ID!
    content: String
  }

  type TodoGroupFieldString @model @auth(rules: [{ allow: groups, groupsField: "groupField", groupClaim: "user_groups" }]) {
    id: ID!
    content: String
    groupField: String
  }

  type TodoGroupFieldList @model @auth(rules: [{ allow: groups, groupsField: "groupsField", groupClaim: "user_groups" }]) {
    id: ID!
    content: String
    groupsField: [String]
  }
`;

export const sqlCreateStatements = generateDDL(schema);
