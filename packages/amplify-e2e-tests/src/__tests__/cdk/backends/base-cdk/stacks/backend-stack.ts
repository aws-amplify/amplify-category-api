import { Construct } from "constructs";
import { Stack, StackProps, Duration } from "aws-cdk-lib";
import { AmplifyGraphqlApi } from "@aws-amplify/graphql-api-construct-alpha";

/**
 *
 */
export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new AmplifyGraphqlApi(this, "GraphqlApi", {
      apiName: "MyGraphQLApi",
      schema: /* GraphQL */ `
        type Todo @model @auth(rules: [{ allow: public }]) {
          description: String!
        }
      `,
      authorizationConfig: {
        defaultAuthMode: "API_KEY",
        apiKeyConfig: {
          expires: Duration.days(30),
        },
      },
    });
  }
}
