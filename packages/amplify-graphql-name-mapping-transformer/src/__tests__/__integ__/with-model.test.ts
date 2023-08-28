import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { MapsToTransformer } from '@aws-amplify/graphql-maps-to-transformer';

describe('@mapsTo directive on model type', () => {
  it('generates table name with mapped name', () => {
    const basicSchema = /* GraphQL */ `
      type Todo @model @mapsTo(name: "Task") {
        id: ID!
        title: String!
      }
    `;
    const out = testTransform({
      schema: basicSchema,
      transformers: [new ModelTransformer(), new MapsToTransformer()],
      transformParameters: {
        sandboxModeEnabled: true,
      },
    });
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
