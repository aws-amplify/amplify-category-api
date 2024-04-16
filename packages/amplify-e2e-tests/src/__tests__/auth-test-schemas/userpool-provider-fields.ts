import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  type TodoPrivateContentVarious @model @auth(rules: [{ allow: private }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: private }, { allow: public }])
    owner: String
    authors: [String]
    customGroup: String
    customGroups: [String]
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [create, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [update, read] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"] }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "customGroup", operations: [create, read] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "customGroups", operations: [update, read] }])
  }

  type TodoOwnerContentVarious @model @auth(rules: [{ allow: owner }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: owner }, { allow: private }, { allow: public }])
    owner: String
    authors: [String]
    customGroup: String
    customGroups: [String]
    privateContent: String @auth(rules: [{ allow: private, operations: [create, update, read] }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [update, delete, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [create, read] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"] }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "customGroup", operations: [update, delete, read] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "customGroups", operations: [create, read] }])
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
    customGroup: String
    customGroups: [String]
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [update, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [create, read] }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "customGroup", operations: [update, delete, read] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "customGroups", operations: [create, read] }])
  }

  type TodoCustomGroupContentVarious @model @auth(rules: [{ allow: groups, groupsField: "customGroup" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "customGroup" }, { allow: private }, { allow: public }])
    owner: String
    authors: [String]
    customGroup: String
    customGroups: [String]
    privateContent: String @auth(rules: [{ allow: private }, { allow: groups, groupsField: "customGroup", operations: [delete] }])
    publicContent: String @auth(rules: [{ allow: public }, { allow: groups, groupsField: "customGroup", operations: [delete] }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [update, read] }, { allow: groups, groupsField: "customGroup", operations: [delete] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [create, read] }, { allow: groups, groupsField: "customGroup", operations: [delete] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"] }, { allow: groups, groupsField: "customGroup", operations: [delete] }])
    groupsContent: String @auth(rules: [{ allow: groups, groupsField: "customGroups", operations: [create, read] }, { allow: groups, groupsField: "customGroup", operations: [delete] }])
  }

  type TodoCustomGroupsContentVarious @model @auth(rules: [{ allow: groups, groupsField: "customGroups" }]) {
    customId: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "customGroups" }, { allow: private }, { allow: public }])
    owner: String
    authors: [String]
    customGroup: String
    customGroups: [String]
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
    ownerContent: String @auth(rules: [{ allow: owner, operations: [update, read] }])
    ownersContent: String @auth(rules: [{ allow: owner, ownerField: "authors", operations: [create, read] }])
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"] }])
    groupContent: String @auth(rules: [{ allow: groups, groupsField: "customGroup", operations: [update, read] }])
  }

  type TodoModel @model @auth(rules: [{ allow: private }]) {
    id: ID! @primaryKey
    name: String!
    note: NoteNonModel
  }

  type NoteNonModel {
    content: String!
    adminContent: String @auth(rules: [{ allow: groups, groups: ["Admin"] }])
  }

  type TodoRenamedFields @model @auth(rules: [{ allow: private }]) {
    id: ID! @primaryKey @refersTo(name: "todo_id")
    privateContent: String! @refersTo(name: "private_content")
    author: String @refersTo(name: "author_field")
    authors: [String] @refersTo(name: "authors_field")
    customGroup: String @refersTo(name: "custom_group")
    customGroups: [String] @refersTo(name: "custom_groups")
    ownerContent: String @refersTo(name: "owner_content") @auth(rules: [{ allow: owner, ownerField: "author", operations: [create, read] }])
    ownersContent: String @refersTo(name: "owners_content") @auth(rules: [{ allow: owner, ownerField: "authors", operations: [update, read] }])
    adminContent: String @refersTo(name: "admin_content") @auth(rules: [{ allow: groups, groups: ["Admin"] }])
    groupContent: String @refersTo(name: "group_content") @auth(rules: [{ allow: groups, groupsField: "customGroup", operations: [create, read] }])
    groupsContent: String @refersTo(name: "groups_content") @auth(rules: [{ allow: groups, groupsField: "customGroups", operations: [update, read] }])
  }

  type PrimaryOne @model @auth(rules: [{ allow: owner }]) {
    id: String! @primaryKey
    owner: String
    relatedOne: RelatedOne @hasOne(references: ["primaryId"])
  }

  type RelatedOne @model @auth(rules: [{ allow: owner, ownerField: "relatedOwner" }]) {
    id: String! @primaryKey
    relatedOwner: String
    primaryId: String
    primary: PrimaryOne @belongsTo(references: ["primaryId"])
  }

  type PrimaryTwo @model @auth(rules: [{ allow: owner }]) {
    id: String! @primaryKey
    owner: String
    relatedTwos: [RelatedTwo] @hasMany(references: ["primaryId"])
  }

  type RelatedTwo @model @auth(rules: [{ allow: owner, ownerField: "relatedOwner" }]) {
    id: String! @primaryKey
    relatedOwner: String
    primaryId: String
    primary: PrimaryTwo @belongsTo(references: ["primaryId"])
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema, engine);
