import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CodegenAssets } from '../../internal';

describe('CodegenAssets', () => {
  it('returns an s3 uri for the model schema', () => {
    const stack = new cdk.Stack();

    const modelSchema = /* GraphQL */ `
      type Todo @model @auth(rules: [{ allow: owner }]) {
        description: String!
      }
    `;

    // id on here matters, since the generated logicalId is used for the backend processor.
    const assets = new CodegenAssets(stack, 'AmplifyCodegenAssets', { modelSchema });

    expect(assets.modelSchemaS3Uri).toBeDefined();
    expect(assets.modelSchemaS3Uri).toMatch(/s3:\/\/\${Token\[TOKEN\.[a-zA-Z0-9]*?\]}\/model-schema\.graphql/);

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::S3::Bucket', 1);
  });
});
