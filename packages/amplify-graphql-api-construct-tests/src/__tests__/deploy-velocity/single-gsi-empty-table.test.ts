import { testManagedTableDeployment } from './deploy-velocity-test-core';

testManagedTableDeployment({
  name: 'Single GSI updated - Empty Table',
  testDurationLimitMs: 10 * 60 * 1000, // 10 Minutes
  initialSchema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      field1: String!
    }
  `,
  updatedSchema: /* GraphQL */ `
    type Todo @model @auth(rules: [{ allow: public }]) {
      field1: String! @index
    }
  `,
  dataSetup: async (): Promise<void> => {
    return;
  },
  dataValidate: async (): Promise<void> => {
    return;
  },
});
