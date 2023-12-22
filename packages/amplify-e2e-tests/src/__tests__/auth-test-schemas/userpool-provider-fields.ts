import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { convertToDBSpecificGraphQLString, generateDDL } from '../../rds-v2-test-utils';

export const schema = (engine: ImportedRDSType): string => `
  type TodoPrivateContentVarious @model @auth(rules: [{ allow: private }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: private }, { allow: public }])
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
  }

  type TodoOwnerContentVarious @model @auth(rules: [{ allow: owner }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: owner }, { allow: private }, { allow: public }])
    owner: String
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
  }

  type TodoCustomOwnerContentVarious @model @auth(rules: [{ allow: owner, ownerField: "author" }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: owner, ownerField: "author" }, { allow: private }, { allow: public }])
    author: String
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
  }

  type TodoCustomOwnersContentVarious @model @auth(rules: [{ allow: owner, ownerField: "authors" }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: owner, ownerField: "authors" }, { allow: private }, { allow: public }])
    authors: [String]
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
  }

  type TodoAdminContentVarious @model @auth(rules: [{ allow: groups, groups: ["Admin"] }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: groups, groups: ["Admin"] }, { allow: private }, { allow: public }])
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
  }

  type TodoCustomGroupContentVarious @model @auth(rules: [{ allow: groups, groupsField: "customGroup" }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "customGroup" }, { allow: private }, { allow: public }])
    customGroup: String
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
  }

  type TodoCustomGroupsContentVarious @model @auth(rules: [{ allow: groups, groupsField: "customGroups" }]) {
    id: ID! @primaryKey @auth(rules: [{ allow: groups, groupsField: "customGroups" }, { allow: private }, { allow: public }])
    customGroups: [String]
    privateContent: String @auth(rules: [{ allow: private }])
    publicContent: String @auth(rules: [{ allow: public }])
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema(engine), engine);
