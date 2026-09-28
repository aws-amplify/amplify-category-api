import { CfnGraphQLSchema } from 'aws-cdk-lib/aws-appsync';
import { Lazy } from 'aws-cdk-lib';
import { S3Asset } from '@aws-amplify/graphql-transformer-interfaces';
import { ResourceConstants } from 'graphql-transformer-common';
import { GraphQLApi } from '../graphql-api';
import { removeAmplifyInputDefinition } from '../transformation/utils';

export class TransformerSchema {
  private asset?: S3Asset;

  private api?: GraphQLApi;

  private definition = '';

  private schemaConstruct?: CfnGraphQLSchema;

  /**
   * Binds the schema to the API, creating the `AWS::AppSync::GraphQLSchema` resource.
   *
   * @param api the GraphQL API to attach the schema to
   * @param preserveLegacyLogicalId when true, forces the schema resource's CloudFormation logical
   *   ID to the Gen1 value (`GraphQLSchema`) instead of the CDK-generated
   *   `GraphQLAPITransformerSchema<hash>`. Set ONLY during a Gen1 v1->v2 migration of an API whose
   *   deployed template already carries the schema at `GraphQLSchema`, so the migration is an
   *   in-place update rather than a create-before-delete that collides on the deterministic
   *   physical ID `<apiId>GraphQLSchema`.
   */
  bind = (api: GraphQLApi, preserveLegacyLogicalId = false): CfnGraphQLSchema => {
    if (!this.schemaConstruct) {
      const schema = this;
      this.api = api;
      this.schemaConstruct = new CfnGraphQLSchema(api, 'TransformerSchema', {
        apiId: api.apiId,
        definitionS3Location: Lazy.string({
          produce: () => {
            const asset = schema.addAsset();
            return asset.s3ObjectUrl;
          },
        }),
      });
      if (preserveLegacyLogicalId) {
        this.schemaConstruct.overrideLogicalId(ResourceConstants.RESOURCES.GraphQLSchemaLogicalID);
      }
    }
    return this.schemaConstruct;
  };

  private addAsset = (): S3Asset => {
    if (!this.api) {
      throw new Error('Schema not bound');
    }
    if (!this.asset) {
      this.asset = this.api.assetProvider.provide(this.api, 'schema', {
        fileName: 'schema.graphql',
        fileContent: removeAmplifyInputDefinition(this.definition),
      });
    }
    return this.asset;
  };

  addToSchema = (addition: string, delimiter: string): void => {
    const sep = delimiter ?? '';
    this.definition = `${this.definition}${sep}${addition}\n`;
  };
}
