import { testManagedTableDeployment } from './deploy-velocity-test-core';

testManagedTableDeployment({
  name: '3 GSIs updated - Empty Table',
  maxDeployDurationMs: 30 * 60 * 1000, // 30 Minutes
  initialSchema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      field1: String!
      field2: String!
      field3: String!
    }
  `,
  updatedSchema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      field1: String! @index
      field2: String! @index
      field3: String! @index
    }
  `,
});
