import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { generateDDL, getRDSTableNamePrefix } from '../../../utils/sql-provider-helper';

export const schema = (engine: ImportedRDSType): string => /* GraphQL */ `
  type Contact @refersTo(name: "${getRDSTableNamePrefix()}contact") @model {
    id: Int! @primaryKey
    firstname: String
    lastname: String
    tags: [String]
    address: ContactAddress
  }

  type ContactAddress {
    city: String!
    state: String!
    street: String!
    zip: String!
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema(engine), engine);
