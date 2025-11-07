import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DeploymentResources, mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { BelongsToTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import { DDB_DEFAULT_DATASOURCE_STRATEGY, constructDataSourceStrategies } from '@aws-amplify/graphql-transformer-core';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { RefersToTransformer } from '../../graphql-refers-to-transformer';
import { MapsToTransformer } from '../../graphql-maps-to-transformer';
import {
  expectedResolversForModelWithRenamedField,
  testTableNameMapping,
  testRelationalFieldMapping,
  testRelationalNonScalarFieldsMapping,
  testRelationalArrayFieldsMapping,
} from './common';

const mappedHasOne = /* GraphQL */ `
  type Employee @model @mapsTo(name: "Person") {
    id: ID!
    tags: [String]
    task: Task @hasOne
  }

  type Task @model {
    id: ID!
    tags: [String]
    title: String
  }
`;

const mappedBelongsTo = /* GraphQL */ `
  type Employee @model {
    id: ID!
    tags: [String]
    task: Task @hasOne
  }

  type Task @model @mapsTo(name: "Todo") {
    id: ID!
    title: String
    tags: [String]
    employee: Employee @belongsTo
  }
`;

const biDiHasOneMapped = /* GraphQL */ `
  type Employee @model @mapsTo(name: "Person") {
    id: ID!
    task: Task @hasOne
  }

  type Task @model @mapsTo(name: "Todo") {
    id: ID!
    title: String
    employee: Employee @hasOne
  }
`;

const refersToHasOne = /* GraphQL */ `
  type Employee @model @refersTo(name: "Person") {
    id: ID! @primaryKey
    tags: [String]
    task: Task @hasOne(references: ["employeeId"])
  }

  type Task @model @refersTo(name: "Todo") {
    id: ID! @primaryKey
    title: String
    tags: [String]
    employeeId: String!
    employee: Employee @belongsTo(references: ["employeeId"])
  }
`;

const transformSchema = (
  schema: string,
  strategy: ModelDataSourceStrategy,
): DeploymentResources & {
  logs: any[];
} => {
  return testTransform({
    schema,
    transformers: [
      new ModelTransformer(),
      new HasOneTransformer(),
      new BelongsToTransformer(),
      new PrimaryKeyTransformer(),
      new MapsToTransformer(),
      new RefersToTransformer(),
    ],
    dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
    transformParameters: {
      sandboxModeEnabled: true,
    },
  });
};

describe('@mapsTo with @hasOne', () => {
  it('adds CRUD input and output mappings on hasOne type', () => {
    const out = transformSchema(mappedHasOne, DDB_DEFAULT_DATASOURCE_STRATEGY);
    const expectedResolvers: string[] = expectedResolversForModelWithRenamedField('Employee');
    expectedResolvers.forEach((resolver) => {
      expect(out.resolvers[resolver]).toMatchSnapshot();
    });
  });

  it('if belongsTo related type is renamed, adds mappings when fetching related type through hasOne field', () => {
    const out = transformSchema(mappedBelongsTo, DDB_DEFAULT_DATASOURCE_STRATEGY);
    expect(out.resolvers['Employee.task.postDataLoad.1.res.vtl']).toMatchInlineSnapshot(`
      "$util.qr($ctx.prev.result.put("taskEmployeeId", $ctx.prev.result.todoEmployeeId))
      $util.qr($ctx.prev.result.remove("todoEmployeeId"))
      $util.toJson($ctx.prev.result)"
    `);
  });

  it('if bi-di hasOne, remaps foreign key in both types', () => {
    const out = transformSchema(biDiHasOneMapped, DDB_DEFAULT_DATASOURCE_STRATEGY);
    expect(out.resolvers['Employee.task.postDataLoad.1.res.vtl']).toMatchInlineSnapshot(`
      "$util.qr($ctx.prev.result.put("taskEmployeeId", $ctx.prev.result.todoEmployeeId))
      $util.qr($ctx.prev.result.remove("todoEmployeeId"))
      $util.toJson($ctx.prev.result)"
    `);
    expect(out.resolvers['Task.employee.postDataLoad.1.res.vtl']).toMatchInlineSnapshot(`
      "$util.qr($ctx.prev.result.put("employeeTaskId", $ctx.prev.result.personTaskId))
      $util.qr($ctx.prev.result.remove("personTaskId"))
      $util.toJson($ctx.prev.result)"
    `);
  });
});

describe('@refersTo with @hasOne for RDS Models', () => {
  it('model table names are mapped', () => {
    const mySqlStrategy = mockSqlDataSourceStrategy();
    const out = transformSchema(refersToHasOne, mySqlStrategy);
    testTableNameMapping('Employee', 'Person', out);
    testTableNameMapping('Task', 'Todo', out);
    testRelationalFieldMapping('Employee.task.req.vtl', 'Todo', out);
    testRelationalFieldMapping('Task.employee.req.vtl', 'Person', out);
    testRelationalNonScalarFieldsMapping('Employee.task.req.vtl', '["tags", "employee"]', out);
    testRelationalNonScalarFieldsMapping('Task.employee.req.vtl', '["tags", "task"]', out);
    testRelationalArrayFieldsMapping('Employee.task.req.vtl', '["tags"]', out);
    testRelationalArrayFieldsMapping('Task.employee.req.vtl', '["tags"]', out);
  });
});
