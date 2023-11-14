import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { convertToDBSpecificGraphQLString, generateDDL } from '../../rds-v2-test-utils';

export const schema = (engine: ImportedRDSType): string => `
  type TodoPrivate @model @auth(rules: [{ allow: private }]) {
    id: ID! @primaryKey
    content: String
  }

  type TodoOwner @model @auth(rules: [{ allow: owner }]) {
    id: ID! @primaryKey
    content: String
    owner: String
  }

  type TodoOwnerFieldString @model @auth(rules: [{ allow: owner, ownerField: "author" }]) {
    id: ID! @primaryKey
    content: String
    author: String
  }

  type TodoOwnerFieldList @model @auth(rules: [{ allow: owner, ownerField: "authors" }]) {
    id: ID! @primaryKey
    content: String
    authors: [String]
  }

  type TodoStaticGroup @model @auth(rules: [{ allow: groups, groups: ["Admin"] }]) {
    id: ID! @primaryKey
    content: String
  }

  type TodoGroupFieldString @model @auth(rules: [{ allow: groups, groupsField: "groupField" }]) {
    id: ID! @primaryKey
    content: String
    groupField: String
  }

  type TodoGroupFieldList @model @auth(rules: [{ allow: groups, groupsField: "groupsField" }]) {
    id: ID! @primaryKey
    content: String
    groupsField: [String]
  }

  type TodoNonModel {
    id: ID,
    content: String
  }

  type Query {
    customGetTodoPrivate(id: ID!): [TodoNonModel] @sql(statement: "SELECT * FROM ${convertToDBSpecificGraphQLString(
      'TodoPrivate',
      engine,
    )} WHERE id = :id") @auth(rules: [{ allow: private }])
    customGetTodoStaticGroup(id: ID!): [TodoNonModel] @sql(statement: "SELECT * FROM ${convertToDBSpecificGraphQLString(
      'TodoStaticGroup',
      engine,
    )} WHERE id = :id") @auth(rules: [{ allow: groups, groups: ["Admin"] }])
  }

  type Mutation {
    addTodoPrivate(id: ID!, content: String): TodoNonModel @sql(statement: "INSERT INTO ${convertToDBSpecificGraphQLString(
      'TodoPrivate',
      engine,
    )} VALUES(:id, :content)") @auth(rules: [{ allow: private }])
    addTodoStaticGroup(id: ID!, content: String): TodoNonModel @sql(statement: "INSERT INTO ${convertToDBSpecificGraphQLString(
      'TodoStaticGroup',
      engine,
    )} VALUES(:id, :content)") @auth(rules: [{ allow: groups, groups: ["Admin"] }])
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema(engine), engine);
