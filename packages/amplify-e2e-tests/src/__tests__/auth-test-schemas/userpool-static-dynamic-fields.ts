import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  # Owners may update their owned records.
  # Admins may create Employee records.
  # Any authenticated user may view Employee ids, bios & emails.
  # Owners and members of "Admin" group may see employee salaries.
  # Owners of "Admin" group may create and update employee salaries.
  type Employee
    @model
    @auth(
      rules: [
        { allow: groups, groups: ["Admin"] }
        { allow: private, operations: [read] }
        { allow: owner, ownerField: "email", operations: [read, update] }
        { allow: groups, groupsField: "team", operations: [read] }
      ]
    ) {
    id: ID! @primaryKey
    # bio, notes and accolades are the only fields an owner can update
    # bio can be read by all signed-in users
    bio: String

    # The delete operation means you cannot update the value to "null" or "undefined".
    # Since delete operations are at the object level, this actually adds auth rules to the update mutation.
    
    # notes are only available for owners, teammates and admins
    notes: String
      @auth(
        rules: [
          { allow: groups, groups: ["Admin"] },
          {
            allow: owner
            ownerField: "email"
            operations: [read, update, delete]
          }
          { allow: groups, groupsField: "team", operations: [read] }
        ]
      )
    # Both owners and teammates can update the accolades
    # Other signed-in users can only read them
    accolades: [String]
      @auth(
        rules: [
          { allow: groups, groups: ["Admin"] }
          { allow: owner, ownerField: "email", operations: [update, read] }
          { allow: groups, groupsField: "team", operations: [update, read]}
          { allow: private, operations: [read] }
        ]
      )

    # Fields with ownership conditions take precendence to the Object @auth.
    # That means that both the @auth on Object AND the @auth on the field must
    # be satisfied.

    # Only "Admin"s may create/update/delete email.
    # Read-only access for all signed-in users
    email: String
      @auth(
        rules: [
          { allow: groups, groups: ["Admin"] }
          { allow: private, operations: [read] }
        ]
      )

    # The owner & "Admin"s may view the salary. Only "Admins" may create/update.
    # Salary is not available for non-owner users
    salary: Int
      @auth(
        rules: [
          { allow: groups, groups: ["Admin"] }
          { allow: owner, ownerField: "email", operations: [read] }
        ]
      )
    # Only Admin group users can CRUD the team
    team: [String]
      @auth(
        rules: [
          { allow: groups, groups: ["Admin"] }
          { allow: private, operations: [read] }
        ]
      )
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema, engine);
