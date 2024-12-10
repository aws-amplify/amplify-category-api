import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DeploymentResources, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { MapsToTransformer } from '@aws-amplify/graphql-maps-to-transformer';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { DDB_DEFAULT_DATASOURCE_STRATEGY, constructDataSourceStrategies } from '@aws-amplify/graphql-transformer-core';
import { ModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { RefersToTransformer } from '../../graphql-refers-to-transformer';

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
