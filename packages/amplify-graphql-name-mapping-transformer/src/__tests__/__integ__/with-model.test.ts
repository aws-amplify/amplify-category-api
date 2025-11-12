import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DeploymentResources, mockSqlDataSourceStrategy, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { MapsToTransformer } from '@aws-amplify/graphql-maps-to-transformer';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { DDB_DEFAULT_DATASOURCE_STRATEGY, constructDataSourceStrategies } from '@aws-amplify/graphql-transformer-core';
import { ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { RefersToTransformer } from '../../graphql-refers-to-transformer';
import { testTableNameMapping, testColumnNameMapping } from './common';

const transformSchema = (
  schema: string,
  strategy: ModelDataSourceStrategy,
): DeploymentResources & {
  logs: any[];
} => {
  return testTransform({
    schema,
    transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new MapsToTransformer(), new RefersToTransformer()],
    dataSourceStrategies: constructDataSourceStrategies(schema, strategy),
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
    const out = transformSchema(basicSchema, DDB_DEFAULT_DATASOURCE_STRATEGY);
    expect(out.stacks.Task.Resources!.TaskTable!.Properties.TableName).toMatchInlineSnapshot(`
      {
        "Fn::Join": [
          "",
          [
            "Task-",
            {
              "Ref": "referencetotransformerrootstackGraphQLAPI20497F53ApiId",
            },
            "-",
            {
              "Ref": "referencetotransformerrootstackenv10C5A902Ref",
            },
          ],
        ],
      }
    `);
    expect(out.stacks.Task.Outputs!.GetAttTaskTableName).toMatchInlineSnapshot(`
      {
        "Description": "Your DynamoDB table name.",
        "Export": {
          "Name": {
            "Fn::Join": [
              ":",
              [
                {
                  "Ref": "referencetotransformerrootstackGraphQLAPI20497F53ApiId",
                },
                "GetAtt:TaskTable:Name",
              ],
            ],
          },
        },
        "Value": {
          "Ref": "TaskTable",
        },
      }
    `);
  });
});

describe('@refersTo with SQL Models', () => {
  const mySqlStrategy = mockSqlDataSourceStrategy();

  it('model table names are mapped', () => {
    const basicSchema = /* GraphQL */ `
      type Todo @model @refersTo(name: "Task") {
        id: ID! @primaryKey
        title: String!
      }
    `;
    const out = transformSchema(basicSchema, mySqlStrategy);
    testTableNameMapping('Todo', 'Task', out);
  });

  it('model field names are mapped', () => {
    const basicSchema = /* GraphQL */ `
      type Todo @model {
        id: ID! @primaryKey
        title: String! @refersTo(name: "description")
      }
    `;
    const out = transformSchema(basicSchema, mySqlStrategy);
    testColumnNameMapping('Todo', out);
  });
});
