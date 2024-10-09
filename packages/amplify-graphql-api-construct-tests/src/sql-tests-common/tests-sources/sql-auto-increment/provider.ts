import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { generateDDL, getRDSTableNamePrefix } from '../../../utils/sql-provider-helper';

export const schema = (): string => /* GraphQL */ `
  type CoffeeQueue @model @refersTo(name: "${getRDSTableNamePrefix()}coffee_queue") {
    orderNumber: Int! @primaryKey @default
    order: String!
    customer: String
  }
`;

export const sqlCreateStatements = (): string[] => {
  return [
    `CREATE TABLE "${getRDSTableNamePrefix()}coffee_queue" ("orderNumber" SERIAL PRIMARY KEY, "order" VARCHAR(256) NOT NULL, "customer" VARCHAR(256))`,
  ];
};
