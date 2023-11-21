import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DeploymentResources, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { BelongsToTransformer, HasOneTransformer } from '@aws-amplify/graphql-relational-transformer';
import { DDB_DB_TYPE, MYSQL_DB_TYPE, constructDataSourceMap } from '@aws-amplify/graphql-transformer-core';
import { DataSourceType, DynamoDBProvisionStrategy, SQLLambdaModelProvisionStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { RefersToTransformer } from '../../graphql-refers-to-transformer';
import { MapsToTransformer } from '../../graphql-maps-to-transformer';
import { expectedResolversForModelWithRenamedField, testTableNameMapping, testRelationalFieldMapping } from './common';

const mappedHasOne = /* GraphQL */ `
  type Employee @model @mapsTo(name: "Person") {
    id: ID!
    task: Task @hasOne
  }

  type Task @model {
    id: ID!
    title: String
  }
`;

const mappedBelongsTo = /* GraphQL */ `
  type Employee @model {
    id: ID!
    task: Task @hasOne
  }

  type Task @model @mapsTo(name: "Todo") {
    id: ID!
    title: String
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
    task: Task @hasOne(references: ["employeeId"])
  }

  type Task @model @refersTo(name: "Todo") {
    id: ID! @primaryKey
    title: String
    employeeId: String!
    employee: Employee @belongsTo(references: ["employeeId"])
  }
`;

const transformSchema = (
  schema: string,
  dataSourceType: DataSourceType,
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
    modelToDatasourceMap: constructDataSourceMap(schema, dataSourceType),
    transformParameters: {
      sandboxModeEnabled: true,
    },
  });
};

const DEFAULT_DYNAMODB_DATASOURCE_TYPE: DataSourceType = {
  dbType: DDB_DB_TYPE,
  provisionDB: true,
  provisionStrategy: DynamoDBProvisionStrategy.DEFAULT,
};

describe('@mapsTo with @hasOne', () => {
  it('adds CRUD input and output mappings on hasOne type', () => {
    const out = transformSchema(mappedHasOne, DEFAULT_DYNAMODB_DATASOURCE_TYPE);
    const expectedResolvers: string[] = expectedResolversForModelWithRenamedField('Employee');
    expectedResolvers.forEach((resolver) => {
      expect(out.resolvers[resolver]).toMatchSnapshot();
    });
  });

  it('if belongsTo related type is renamed, adds mappings when fetching related type through hasOne field', () => {
    const out = transformSchema(mappedBelongsTo, DEFAULT_DYNAMODB_DATASOURCE_TYPE);
    expect(out.resolvers['Employee.task.postDataLoad.1.res.vtl']).toMatchInlineSnapshot(`
      "$util.qr($ctx.prev.result.put(\\"taskEmployeeId\\", $ctx.prev.result.todoEmployeeId))
      $util.qr($ctx.prev.result.remove(\\"todoEmployeeId\\"))
      $util.toJson($ctx.prev.result)"
    `);
  });

  it('if bi-di hasOne, remaps foreign key in both types', () => {
    const out = transformSchema(biDiHasOneMapped, DEFAULT_DYNAMODB_DATASOURCE_TYPE);
    expect(out.resolvers['Employee.task.postDataLoad.1.res.vtl']).toMatchInlineSnapshot(`
      "$util.qr($ctx.prev.result.put(\\"taskEmployeeId\\", $ctx.prev.result.todoEmployeeId))
      $util.qr($ctx.prev.result.remove(\\"todoEmployeeId\\"))
      $util.toJson($ctx.prev.result)"
    `);
    expect(out.resolvers['Task.employee.postDataLoad.1.res.vtl']).toMatchInlineSnapshot(`
      "$util.qr($ctx.prev.result.put(\\"employeeTaskId\\", $ctx.prev.result.personTaskId))
      $util.qr($ctx.prev.result.remove(\\"personTaskId\\"))
      $util.toJson($ctx.prev.result)"
    `);
  });
});

describe('@refersTo with @hasOne for RDS Models', () => {
  it('model table names are mapped', () => {
    const out = transformSchema(refersToHasOne, {
      dbType: MYSQL_DB_TYPE,
      provisionDB: false,
      provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
    });
    testTableNameMapping('Employee', 'Person', out);
    testTableNameMapping('Task', 'Todo', out);
    testRelationalFieldMapping('Employee.task.req.vtl', 'Todo', out);
    testRelationalFieldMapping('Task.employee.req.vtl', 'Person', out);
  });
});
