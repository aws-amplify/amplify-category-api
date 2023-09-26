import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { MapsToTransformer } from '@aws-amplify/graphql-maps-to-transformer';
import { DDB_DB_TYPE, MYSQL_DB_TYPE, DBType } from '@aws-amplify/graphql-transformer-core';
import { constructModelToDataSourceMap, testTableNameMapping, testColumnNameMapping } from './common';
import { RefersToTransformer } from '../../graphql-refers-to-transformer';

const transformSchema = (schema: string, dbType: DBType) => {
  return testTransform({
    schema,
    transformers: [new ModelTransformer(), new MapsToTransformer(), new RefersToTransformer()],
    modelToDatasourceMap: constructModelToDataSourceMap(['Todo'], dbType),
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
    const out = transformSchema(basicSchema, DDB_DB_TYPE);
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

describe('@refersTo with RDS Models', () => {
  it('model table names are mapped', () => {
    const basicSchema = /* GraphQL */ `
      type Todo @model @refersTo(name: "Task") {
        id: ID!
        title: String!
      }
    `;
    const out = transformSchema(basicSchema, MYSQL_DB_TYPE);
    testTableNameMapping('Todo', 'Task', out);
  });

  it('model field names are mapped', () => {
    const basicSchema = /* GraphQL */ `
      type Todo @model {
        id: ID!
        title: String! @refersTo(name: "description")
      }
    `;
    const out = transformSchema(basicSchema, MYSQL_DB_TYPE);
    testColumnNameMapping('Todo', out);
  });
});
