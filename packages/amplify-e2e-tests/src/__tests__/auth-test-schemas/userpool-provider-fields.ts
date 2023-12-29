import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { convertToDBSpecificGraphQLString, generateDDL } from '../../rds-v2-test-utils';

export const schema = (engine: ImportedRDSType): string => `
  type TodoPrivateContentVarious @model @auth(rules: [{ allow: private }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: private }, { allow: public }])
    owner: String
    authors: [String]
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [create, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [update, read] }])
  }

  type TodoOwnerContentVarious @model @auth(rules: [{ allow: owner }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: owner }, { allow: private }, { allow: public }])
    owner: String
    authors: [String]
    privateContent: String @auth(rules: [{ allow: private, operations: [create, update, read] }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [update, delete, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [create, read] }])
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
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors" }])
  }

  type TodoCustomGroupContentVarious @model @auth(rules: [{ allow: groups, groupsField: "customGroup" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "customGroup" }, { allow: private }, { allow: public }])
    owner: String
    authors: [String]
    customGroup: String
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors" }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"] }])
  }

  type TodoCustomGroupsContentVarious @model @auth(rules: [{ allow: groups, groupsField: "customGroups" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "customGroups" }, { allow: private }, { allow: public }])
    owner: String
    authors: [String]
    customGroups: [String]
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors" }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"] }])
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema(engine), engine);
