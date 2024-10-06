import { getRDSTableNamePrefix } from '../../../utils/sql-provider-helper';

export const schema = (): string => /* GraphQL */ `
  type Todo @model @refersTo(name: "${getRDSTableNamePrefix()}todos") {
    id: ID! @primaryKey
    description: String!
  }
  type Student @model @refersTo(name: "${getRDSTableNamePrefix()}students") {
    studentId: Int! @primaryKey(sortKeyFields: ["classId"])
    classId: String!
    firstName: String
    lastName: String
  }
`;

export const sqlCreateStatements = (): string[] => {
  return [
    `CREATE TABLE "${getRDSTableNamePrefix()}todos" ("id" VARCHAR(40) PRIMARY KEY, "description" VARCHAR(256))`,
    `CREATE TABLE "${getRDSTableNamePrefix()}students" ("studentId" integer NOT NULL, "classId" text NOT NULL, "firstName" text, "lastName" text, PRIMARY KEY ("studentId", "classId"))`,
  ];
};
