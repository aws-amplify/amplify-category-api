import * as path from 'path';
import * as os from 'os';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { CfnIncludeProps } from 'aws-cdk-lib/cloudformation-include';
import { Construct } from 'constructs';
import * as fs from 'fs-extra';
import { Template } from './cdk-compat/deployment-resources';

const ROOT_STACK_FILE_NAME = 'stack.json';
const STACKS_DIRECTORY = 'stacks';
const SCHEMA_FILE_NAME = 'schema.graphql';
const RESOLVERS_DIRECTORY = 'resolvers';

/**
 * This is a temporary workaround since the transformer internally synthesizes using CDK.
 * We can't include these via CfnInclude, so we manually remove these from the template.
 * @param stack the stack to scrub.
 */
const cleanupGeneratedCDKMetadata = (stack: Template): void => {
  if (stack && stack.Resources && stack.Resources.CDKMetadata) {
    // eslint-disable-next-line no-param-reassign
    delete stack.Resources.CDKMetadata;
  }
  if (stack && stack.Conditions && stack.Conditions.CDKMetadataAvailable) {
    // eslint-disable-next-line no-param-reassign
    delete stack.Conditions.CDKMetadataAvailable;
  }
};

type RewriteAndPersistAssetParams = {
  schema: string;
  resolvers: Record<string, string>;
  functions: Record<string, string>;
  rootStack: Template;
  stacks: Record<string, Template>;
};

export type PersistedStackResults = Pick<CfnIncludeProps, 'templateFile' | 'loadNestedStacks'>;

/**
 * Write stack assets to disk, and convert into Partial<CfnIncludeProps>.
 */
const persistStackAssets = (assetDir: string, { rootStack, stacks }: RewriteAndPersistAssetParams): PersistedStackResults => {
  const stackDir = fs.mkdtempSync(path.join(assetDir, STACKS_DIRECTORY));

  // Write the root stack and nested stacks to the temp directory.
  cleanupGeneratedCDKMetadata(rootStack);
  const templateFile = path.join(stackDir, ROOT_STACK_FILE_NAME);
  fs.writeFileSync(templateFile, JSON.stringify(rootStack));

  const loadNestedStacks = Object.fromEntries(
    Object.entries(stacks).map(([stackName, stack]) => {
      cleanupGeneratedCDKMetadata(stack);
      const nestedPath = path.join(stackDir, stackName);
      fs.writeFileSync(nestedPath, JSON.stringify(stack));
      return [stackName, { templateFile: nestedPath }];
    }),
  );

  return { templateFile, loadNestedStacks };
};

/**
 * Rewrite assets into the cdk asset directory.
 * @param scope the scope to place the new assets.
 * @param assetDir the temp directory we're storing assets in.
 * @param params list of internal state needed to perform the rewrite.
 */
const rewriteAssets = (scope: Construct, assetDir: string, params: RewriteAndPersistAssetParams): void => {
  const { schema, resolvers, functions, rootStack, stacks } = params;

  const resolverDir = fs.mkdtempSync(path.join(assetDir, RESOLVERS_DIRECTORY));

  const schemaPath = path.join(assetDir, SCHEMA_FILE_NAME);
  fs.writeFileSync(schemaPath, schema);
  const schemaAsset = new Asset(scope, 'schema-asset', { path: schemaPath });
  const schemaResourceKey = Object.entries(rootStack.Resources ?? {}).find(
    ([_, resource]) => resource.Type === 'AWS::AppSync::GraphQLSchema',
  )?.[0];
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
      const requestResponseMappingResourceKey = Object.entries(stacks[stackName].Resources ?? {}).find(
        ([_, resource]) =>
          resource?.Properties?.RequestMappingTemplateS3Location &&
          JSON.stringify(resource.Properties.RequestMappingTemplateS3Location).includes(resolverName),
      )?.[0];
      const responseResponseMappingResourceKey = Object.entries(stacks[stackName].Resources ?? {}).find(
        ([_, resource]) =>
          resource?.Properties?.ResponseMappingTemplateS3Location &&
          JSON.stringify(resource.Properties.ResponseMappingTemplateS3Location).includes(resolverName),
      )?.[0];
      const codeResourceKey = Object.entries(stacks[stackName].Resources ?? {}).find(
        ([_, resource]) =>
          resource?.Properties?.CodeS3Location && JSON.stringify(resource.Properties.CodeS3Location).includes(resolverName),
      )?.[0];
      /* eslint-enable max-len */

      if (requestResponseMappingResourceKey) {
        stacks[stackName].Resources![requestResponseMappingResourceKey!].Properties.RequestMappingTemplateS3Location =
          currDefinitionLocation;
      }
      if (responseResponseMappingResourceKey) {
        stacks[stackName].Resources![responseResponseMappingResourceKey!].Properties.ResponseMappingTemplateS3Location =
          currDefinitionLocation;
      }
      if (codeResourceKey) {
        stacks[stackName].Resources![codeResourceKey!].Properties.CodeS3Location = currDefinitionLocation;
      }
    });
  });

  // Look for AWS::Lambda::Function, and rewrite the path.
  // This is just terrible.
  Object.entries(functions).forEach(([functionName, functionPath]) => {
    [rootStack, ...Object.values(stacks)].forEach((s) => {
      const foundLambdas = s.Resources
        ? Object.values(s.Resources).filter(
            (r) =>
              r.Type === 'AWS::Lambda::Function' &&
              r.Properties &&
              r.Properties.Code &&
              r.Properties.Code.S3Key &&
              JSON.stringify(r.Properties.Code.S3Key).replace(/\./, '').includes(functionName.replace(/\./, '')),
          )
        : [];
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

/**
 * Perform necessary work to rewrite and shim asset files in order to support a CfnInclude from what the Transformer generates.
 * @param scope the cdk scope to create assets within.
 * @param params the config values used in the transform
 * @returns the necessary config to perform a cfnInclude on the rendered cloudassembly.
 */
export const rewriteAndPersistAssets = (scope: Construct, params: RewriteAndPersistAssetParams): PersistedStackResults => {
  const assetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transformer'));
  rewriteAssets(scope, assetDir, params);
  return persistStackAssets(assetDir, params);
};
