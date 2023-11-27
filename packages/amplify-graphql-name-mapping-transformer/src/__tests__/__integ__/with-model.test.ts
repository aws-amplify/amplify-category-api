import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DeploymentResources, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { MapsToTransformer } from '@aws-amplify/graphql-maps-to-transformer';
import { DDB_DEFAULT_DATASOURCE_TYPE, MYSQL_DB_TYPE, constructDataSourceMap } from '@aws-amplify/graphql-transformer-core';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { DataSourceType, SQLLambdaModelProvisionStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { RefersToTransformer } from '../../graphql-refers-to-transformer';
import { testTableNameMapping, testColumnNameMapping } from './common';

const transformSchema = (
  schema: string,
  dataSourceType: DataSourceType,
): DeploymentResources & {
  logs: any[];
} => {
  return testTransform({
    schema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new MapsToTransformer(), new RefersToTransformer()],
    modelToDatasourceMap: constructDataSourceMap(schema, dataSourceType),
    transformParameters: {
      sandboxModeEnabled: true,
    },
  });
};

describe('@mapsTo directive on model type', () => {
  it('generates table name with mapped name', () => {
    const basicSchema = /* GraphQL */ `
      type Todo @model @mapsTo(name: "Task") {
        id: ID!
        title: String!
      }
    `;
    const out = transformSchema(basicSchema, DDB_DEFAULT_DATASOURCE_TYPE);
    expect(out.stacks.Task.Resources!.TaskTable!.Properties.TableName).toMatchInlineSnapshot(`
      Object {
        "Fn::Join": Array [
          "",
          Array [
            "Task-",
            Object {
              "Ref": "referencetotransformerrootstackGraphQLAPI20497F53ApiId",
            },
            "-",
            Object {
              "Ref": "referencetotransformerrootstackenv10C5A902Ref",
            },
          ],
        ],
      }
    `);
    expect(out.stacks.Task.Outputs!.GetAttTaskTableName).toMatchInlineSnapshot(`
      Object {
        "Description": "Your DynamoDB table name.",
        "Export": Object {
          "Name": Object {
            "Fn::Join": Array [
              ":",
              Array [
                Object {
                  "Ref": "referencetotransformerrootstackGraphQLAPI20497F53ApiId",
                },
                "GetAtt:TaskTable:Name",
              ],
            ],
          },
        },
        "Value": Object {
          "Ref": "TaskTable",
        },
      }
    `);
  });
});

describe('@refersTo with SQL Models', () => {
  it('model table names are mapped', () => {
    const basicSchema = /* GraphQL */ `
      type Todo @model @refersTo(name: "Task") {
        id: ID! @primaryKey
        title: String!
      }
    `;
    const out = transformSchema(basicSchema, {
      dbType: MYSQL_DB_TYPE,
      provisionDB: false,
      provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
    });
    testTableNameMapping('Todo', 'Task', out);
  });

  it('model field names are mapped', () => {
    const basicSchema = /* GraphQL */ `
      type Todo @model {
        id: ID! @primaryKey
        title: String! @refersTo(name: "description")
      }
    `;
    const out = transformSchema(basicSchema, {
      dbType: MYSQL_DB_TYPE,
      provisionDB: false,
      provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
    });
    testColumnNameMapping('Todo', out);
  });
});
