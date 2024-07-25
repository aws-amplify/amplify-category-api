import { S3Asset } from '@aws-amplify/graphql-transformer-interfaces';
import { Lazy } from 'aws-cdk-lib';
import { CfnGraphQLSchema } from 'aws-cdk-lib/aws-appsync';
import { GraphQLApi } from '../graphql-api';
import { removeAmplifyInputDefinition } from '../transformation/utils';

export class TransformerSchema {
  private asset?: S3Asset;

  private api?: GraphQLApi;

  private definition = '';

  private schemaConstruct?: CfnGraphQLSchema;

  bind = (api: GraphQLApi): CfnGraphQLSchema => {
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
