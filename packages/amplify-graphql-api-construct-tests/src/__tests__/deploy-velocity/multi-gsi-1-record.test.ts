import { testManagedTableDeployment } from './deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Single Row- 2 GSIs updated',
  testDurationLimitMs: 15 * 60 * 1000, // 15 Minutes
  initialSchema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      field1: String!
      field2: String!
    }
  `,
  updatedSchema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      field1: String! @index
      field2: String! @index
    }
  `,
});
