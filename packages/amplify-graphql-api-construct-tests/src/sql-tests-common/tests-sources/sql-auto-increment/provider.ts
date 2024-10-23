import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { generateDDL, getRDSTableNamePrefix } from '../../../utils/sql-provider-helper';

export const schema = (engine: ImportedRDSType): string => /* GraphQL */ `
  type CoffeeQueue @model @refersTo(name: "${getRDSTableNamePrefix()}coffee_queue") {
    orderNumber: Int! @primaryKey @default
    order: String!
    customer: String
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema(engine), engine);
