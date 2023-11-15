import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  type TodoOwner @model @refersTo(name: "todo_owner") @auth(rules: [{ allow: owner, identityClaim: "user_id" }]) {
    id: ID! @primaryKey
    content: String
    owner: String @refersTo(name: "owner_field")
  }

  type TodoOwnerFieldString @model @refersTo(name: "todo_owner_string") @auth(rules: [{ allow: owner, ownerField: "author", identityClaim: "user_id" }]) {
    id: ID! @primaryKey
    content: String
    author: String @refersTo(name: "author_field")
  }

  type TodoOwnerFieldList @model @refersTo(name: "todo_owner_list") @auth(rules: [{ allow: owner, ownerField: "authors", identityClaim: "user_id" }]) {
    id: ID! @primaryKey
    content: String
    authors: [String] @refersTo(name: "authors_field")
  }

  type TodoStaticGroup @model @refersTo(name: "todo_static_group") @auth(rules: [{ allow: groups, groups: ["Admin"], groupClaim: "cognito:groups" }]) {
    id: ID! @primaryKey
    content: String
  }

  type TodoGroupFieldString @model @refersTo(name: "todo_group_string") @auth(rules: [{ allow: groups, groupsField: "groupField", groupClaim: "cognito:groups" }]) {
    id: ID! @primaryKey
    content: String
    groupField: String @refersTo(name: "group_field")
  }

  type TodoGroupFieldList @model @refersTo(name: "todo_group_list") @auth(rules: [{ allow: groups, groupsField: "groupsField", groupClaim: "cognito:groups" }]) {
    id: ID! @primaryKey
    content: String
    groupsField: [String] @refersTo(name: "groups_field")
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema, engine);
