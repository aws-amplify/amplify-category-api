import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { generateDDL, getRDSTableNamePrefix } from '../../../utils/sql-provider-helper';

export const schema = (engine: ImportedRDSType): string => /* GraphQL */ `
  type Todo @model @refersTo(name: "${getRDSTableNamePrefix()}todos") {
    id: ID! @primaryKey
    description: String
  }
  type Student @model @refersTo(name: "${getRDSTableNamePrefix()}students") {
    studentId: Int! @primaryKey(sortKeyFields: ["classId"])
    classId: String!
    firstName: String
    lastName: String
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema(engine), engine);
