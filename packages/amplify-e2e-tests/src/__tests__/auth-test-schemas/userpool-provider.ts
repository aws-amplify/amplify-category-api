import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  type TodoPrivate @model @auth(rules: [{ allow: private }]) {
    id: ID!
    content: String
  }

  type TodoOwner @model @auth(rules: [{ allow: owner }]) {
    id: ID!
    content: String
    owner: String
  }

  type TodoOwnerFieldString @model @auth(rules: [{ allow: owner, ownerField: "author" }]) {
    id: ID!
    content: String
    author: String
  }

  type TodoOwnerFieldList @model @auth(rules: [{ allow: owner, ownerField: "authors" }]) {
    id: ID!
    content: String
    authors: [String]
  }

  type TodoStaticGroup @model @auth(rules: [{ allow: groups, groups: ["Admin"] }]) {
    id: ID!
    content: String
  }

  type TodoGroupFieldString @model @auth(rules: [{ allow: groups, groupsField: "groupField" }]) {
    id: ID!
    content: String
    groupField: String
  }

  type TodoGroupFieldList @model @auth(rules: [{ allow: groups, groupsField: "groupsField" }]) {
    id: ID!
    content: String
    groupsField: [String]
  }
`;

export const sqlCreateStatements = generateDDL(schema);
