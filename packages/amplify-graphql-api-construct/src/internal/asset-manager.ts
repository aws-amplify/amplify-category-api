import { Template } from '@aws-amplify/graphql-transformer-interfaces';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';
import * as fs from 'fs-extra';
import * as path from 'path';

const SCHEMA_FILE_NAME = 'schema.graphql';
const RESOLVERS_DIRECTORY = 'resolvers';

export type RewriteAssetProps = {
  assetDir: string;
  schema: string;
  resolvers: Record<string, string>;
  functions: Record<string, string>;
  rootStack: Template;
  stacks: Record<string, Template>;
};

/**
 * Rewrite assets into the cdk asset directory.
 * @param scope the scope to place the new assets.
 * @param props list of internal state needed to perform the rewrite.
 */
export const rewriteAssets = (
  scope: Construct, props: RewriteAssetProps,
): void => {
  const {
    assetDir,
    schema,
    resolvers,
    functions,
    rootStack,
    stacks,
  } = props;

  const resolverDir = fs.mkdtempSync(path.join(assetDir, RESOLVERS_DIRECTORY));

  const schemaPath = path.join(assetDir, SCHEMA_FILE_NAME);
  fs.writeFileSync(schemaPath, schema);
  const schemaAsset = new Asset(scope, 'schema-asset', { path: schemaPath });
  const schemaResourceKey = Object.entries(rootStack.Resources ?? {}).find(([_, resource]) => resource.Type === 'AWS::AppSync::GraphQLSchema')?.[0];
  const definitionLocation = ['s3:/', schemaAsset.s3BucketName, schemaAsset.s3ObjectKey].join('/');
  rootStack.Resources![schemaResourceKey!].Properties.DefinitionS3Location = definitionLocation;

  // There's probably a more elegant way to do this, but basically rewrite any sort of paths
  // (be they asset or otherwise) in order to point them to the asset directory for the CDK.
  Object.entries(resolvers).forEach(([resolverName, resolverCode]) => {
    const resolverPath = path.join(resolverDir, resolverName);
    fs.writeFileSync(resolverPath, resolverCode);
    const currSchemaAsset = new Asset(scope, `resource-${resolverName}-asset`, { path: resolverPath });
    const currDefinitionLocation = ['s3:/', currSchemaAsset.s3BucketName, currSchemaAsset.s3ObjectKey].join('/');
    Object.keys(stacks).forEach((stackName) => {
      /* eslint-disable max-len */
      const requestResponseMappingResourceKey = Object.entries(stacks[stackName].Resources ?? {}).find(([_, resource]) => resource?.Properties?.RequestMappingTemplateS3Location && JSON.stringify(resource.Properties.RequestMappingTemplateS3Location).includes(resolverName))?.[0];
      const responseResponseMappingResourceKey = Object.entries(stacks[stackName].Resources ?? {}).find(([_, resource]) => resource?.Properties?.ResponseMappingTemplateS3Location && JSON.stringify(resource.Properties.ResponseMappingTemplateS3Location).includes(resolverName))?.[0];
      const codeResourceKey = Object.entries(stacks[stackName].Resources ?? {}).find(([_, resource]) => resource?.Properties?.CodeS3Location && JSON.stringify(resource.Properties.CodeS3Location).includes(resolverName))?.[0];
      /* eslint-enable max-len */

      if (requestResponseMappingResourceKey) {
        stacks[stackName].Resources![requestResponseMappingResourceKey!].Properties
          .RequestMappingTemplateS3Location = currDefinitionLocation;
      }
      if (responseResponseMappingResourceKey) {
        stacks[stackName].Resources![responseResponseMappingResourceKey!].Properties
          .ResponseMappingTemplateS3Location = currDefinitionLocation;
      }
      if (codeResourceKey) {
        stacks[stackName].Resources![codeResourceKey!].Properties
          .CodeS3Location = currDefinitionLocation;
      }
    });
  });

  // Look for AWS::Lambda::Function, and rewrite the path.
  // This is just terrible.
  Object.entries(functions).forEach(([functionName, functionPath]) => {
    [rootStack, ...Object.values(stacks)].forEach((s) => {
      const foundLambdas = s.Resources ? Object.values(s.Resources).filter((r) => r.Type === 'AWS::Lambda::Function' && r.Properties && r.Properties.Code && r.Properties.Code.S3Key && JSON.stringify(r.Properties.Code.S3Key).replace(/\./, '').includes(functionName.replace(/\./, ''))) : [];
      if (foundLambdas.length > 1) {
        throw new Error(`Expected to find exactly one lambda with key ${functionName}, but did not. Had ${foundLambdas.length} matches`);
      }
      const foundLambda = foundLambdas[0];
      if (foundLambda) {
        const lambdaAsset = new Asset(scope, functionName, { path: functionPath });
        foundLambda.Properties.Code.S3Bucket = lambdaAsset.s3BucketName;
        foundLambda.Properties.Code.S3Key = lambdaAsset.s3ObjectKey;
      }
    });
  });
};
