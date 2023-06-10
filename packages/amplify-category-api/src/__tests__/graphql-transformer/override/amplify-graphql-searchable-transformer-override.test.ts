import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform, StackManager } from '@aws-amplify/graphql-transformer-core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as path from 'path';
import { SearchableModelTransformer } from '@aws-amplify/graphql-searchable-transformer';
import { stateManager } from '@aws-amplify/amplify-cli-core';
import { applyFileBasedOverride } from '../../../graphql-transformer/override';

jest.spyOn(stateManager, 'getLocalEnvInfo').mockReturnValue({ envName: 'testEnvName' });
jest.spyOn(stateManager, 'getProjectConfig').mockReturnValue({ projectName: 'testProjectName' });

test('it overrides expected resources', () => {
  const validSchema = `
    type Post @model @searchable {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
    }
    type Comment @model {
      id: ID!
      content: String!
    }
 `;
  const transformer = new GraphQLTransform({
    transformers: [new ModelTransformer(), new SearchableModelTransformer()],
    overrideConfig: {
      applyOverride: (stackManager: StackManager) => applyFileBasedOverride(stackManager, path.join(__dirname, 'searchable-overrides')),
      overrideFlag: true,
    },
  });
  const out = transformer.transform(validSchema);
  expect(out).toBeDefined();
  const searchableStack = out.stacks.SearchableStack;
  Template.fromJSON(searchableStack)
    .hasResourceProperties('AWS::AppSync::DataSource', {
      ApiId: {
        Ref: Match.anyValue(),
      },
      Name: 'OpenSearchDataSource',
      Type: 'AMAZON_ELASTICSEARCH',
      ElasticsearchConfig: {
        AwsRegion: {
          'Fn::Select': [
            3,
            {
              'Fn::Split': [
                ':',
                {
                  'Fn::GetAtt': ['OpenSearchDomain', 'Arn'],
                },
              ],
            },
          ],
        },
        Endpoint: {
          'Fn::Join': [
            '',
            [
              'https://',
              {
                'Fn::GetAtt': ['OpenSearchDomain', 'DomainEndpoint'],
              },
            ],
          ],
        },
      },
      ServiceRoleArn: 'mockArn',
    });
  Template.fromJSON(searchableStack)
    .hasResourceProperties('AWS::Elasticsearch::Domain', {
      DomainName: Match.anyValue(),
      EBSOptions: Match.anyValue(),
      ElasticsearchClusterConfig: Match.anyValue(),
      ElasticsearchVersion: '7.10',
      EncryptionAtRestOptions: {
        Enabled: true,
        KmsKeyId: '1a2a3a4-1a2a-3a4a-5a6a-1a2a3a4a5a6a',
      },
    });
  Template.fromJSON(searchableStack)
    .hasResourceProperties('AWS::AppSync::Resolver', {
      ApiId: {
        Ref: Match.anyValue(),
      },
      FieldName: Match.anyValue(),
      TypeName: 'Query',
      Kind: 'PIPELINE',
      PipelineConfig: {
        Functions: [
          {
            Ref: Match.anyValue(),
          },
          {
            'Fn::GetAtt': [Match.anyValue(), 'FunctionId'],
          },
        ],
      },
      RequestMappingTemplate: 'mockTemplate',
      ResponseMappingTemplate: '$util.toJson($ctx.prev.result)',
    });
});
