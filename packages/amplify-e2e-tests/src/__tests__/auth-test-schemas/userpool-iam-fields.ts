import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  # I have a model that is protected by userPools by default.
  # I can call CRUD post from my lambda using iam role.
  # I can create posts visiable for all unauthenticated and sigend in users
  # I can create content only visable for subscribers
  # The likes of post are only mutable by lambda using iam role
  type Post
    @model
    @auth(
      rules: [
        # The cognito user pool owner can CRUD.
        { allow: owner }
        # A lambda function using IAM can call CRUD.
        { allow: private, provider: iam }
        # Unauthenticated users using IAM can read posts
        { allow: public, provider: iam, operations: [read] }
        # Signed in users can read posts
        { allow: private, operations: [read] }
        { allow: owner, ownerField: "subscriberList", operations: [read]}
      ]
    ) {
    id: ID! @primaryKey
    title: String
    owner: String
    subscriberList: [String] 
      @auth(
        rules: [
          # Unauthenticated users cannot read subscriber list
          { allow: owner }
          { allow: private, provider: iam }
          { allow: private, operations: [read] }
        ]
      )
    subscriberContent: String
      @auth(rules:[
        # Owner(all ops) and subscribers(read-only) have access to subscriber content
        { allow: owner }
        { allow: owner, ownerField: "subscriberList", operations: [read]}
        # Lambda using iam role can RUD subscriber content
        { allow: private, provider: iam, operations: [read, update, delete]}
      ])
    likes: Int @default(value: "0")
      @auth(rules:[
        # Only lambda function using IAM can update this field
        { allow: private, provider: iam, operations: [read, update, delete]}
        # Others can only read this field
        { allow: public, provider: iam, operations: [read] }
        { allow: private, operations: [read] }
      ])
  }
`;

export const sqlCreateStatements = (engine: ImportedRDSType): string[] => generateDDL(schema, engine);
