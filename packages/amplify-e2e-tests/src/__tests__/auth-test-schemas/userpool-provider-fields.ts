import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  type TodoPrivateContentVarious @model @auth(rules: [{ allow: private }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: private }, { allow: public }])
    owner: String
    authors: [String]
    group: String
    groups: [String]
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [create, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [update, read] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"] }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "group", operations: [create, read] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "groups", operations: [update, read] }])
  }

  type TodoOwnerContentVarious @model @auth(rules: [{ allow: owner }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: owner }, { allow: private }, { allow: public }])
    owner: String
    authors: [String]
    group: String
    groups: [String]
    privateContent: String @auth(rules: [{ allow: private, operations: [create, update, read] }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [update, delete, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [create, read] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"] }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "group", operations: [update, delete, read] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "groups", operations: [create, read] }])
  }

  type TodoCustomOwnerContentVarious @model @auth(rules: [{ allow: owner, ownerField: "author" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: owner, ownerField: "author" }, { allow: private }, { allow: public }])
    author: String
    privateContent: String @auth(rules: [{ allow: private }, { allow: owner, ownerField: "author", operations: [delete] }])
    publicContent: String @auth(rules: [{ allow: public }, { allow: owner, ownerField: "author", operations: [delete] }])
    ownerContent: String @auth(rules: [{ allow: owner, ownerField: "author", operations: [create, delete, read] }])
  }

  type TodoCustomOwnersContentVarious @model @auth(rules: [{ allow: owner, ownerField: "authors" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: owner, ownerField: "authors" }, { allow: private }, { allow: public }])
    authors: [String]
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [update, read] }])
  }

  type TodoAdminContentVarious @model @auth(rules: [{ allow: groups, groups: ["Admin"] }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: groups, groups: ["Admin"] }, { allow: private }, { allow: public }])
    owner: String
    authors: [String]
    group: String
    groups: [String]
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [update, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [create, read] }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "group", operations: [update, delete, read] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "groups", operations: [create, read] }])
  }

  type TodoCustomGroupContentVarious @model @auth(rules: [{ allow: groups, groupsField: "group" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "group" }, { allow: private }, { allow: public }])
    owner: String
    authors: [String]
    group: String
    groups: [String]
    privateContent: String @auth(rules: [{ allow: private }, { allow: groups, groupsField: "group", operations: [delete] }])
    publicContent: String @auth(rules: [{ allow: public }, { allow: groups, groupsField: "group", operations: [delete] }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [update, read] }, { allow: groups, groupsField: "group", operations: [delete] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [create, read] }, { allow: groups, groupsField: "group", operations: [delete] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"] }, { allow: groups, groupsField: "group", operations: [delete] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "groups", operations: [create, read] }, { allow: groups, groupsField: "group", operations: [delete] }])
  }

  type TodoCustomGroupsContentVarious @model @auth(rules: [{ allow: groups, groupsField: "groups" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "groups" }, { allow: private }, { allow: public }])
    owner: String
    authors: [String]
    group: String
    groups: [String]
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [update, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [create, read] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"] }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "group", operations: [update, read] }])
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema, engine);
