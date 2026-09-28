import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { isMigratingFromV1SchemaLogicalId } from '../../graphql-transformer/schema-logical-id-migration';

describe('isMigratingFromV1SchemaLogicalId', () => {
  const v1SchemaResource = { Type: 'AWS::AppSync::GraphQLSchema', Properties: {} };
  let tmpDir: string;
  let apiResourceDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-logicalid-mig-'));
    // Emulate #current-cloud-backend/api/<apiName>
    apiResourceDir = path.join(tmpDir, '#current-cloud-backend', 'api', 'myapi');
    fs.mkdirpSync(path.join(apiResourceDir, 'build', 'stacks'));
  });

  afterEach(() => {
    fs.removeSync(tmpDir);
  });

  const writeRootTemplate = (template: unknown): void => {
    fs.writeJsonSync(path.join(apiResourceDir, 'build', 'cloudformation-template.json'), template);
  };
  const writeChildStack = (name: string, template: unknown): void => {
    fs.writeJsonSync(path.join(apiResourceDir, 'build', 'stacks', name), template);
  };

  it('returns false when the deployed dir is undefined (no previous deployment)', () => {
    expect(isMigratingFromV1SchemaLogicalId(undefined)).toBe(false);
  });

  it('returns false when the build dir does not exist', () => {
    expect(isMigratingFromV1SchemaLogicalId(path.join(tmpDir, 'does-not-exist'))).toBe(false);
  });

  it('returns true when the ROOT deployed template carries the schema at logical ID GraphQLSchema (v1 layout)', () => {
    writeRootTemplate({ Resources: { GraphQLSchema: v1SchemaResource } });
    expect(isMigratingFromV1SchemaLogicalId(apiResourceDir)).toBe(true);
  });

  it('returns true when a child stack under build/stacks carries the schema at GraphQLSchema (fallback)', () => {
    writeRootTemplate({ Resources: {} });
    writeChildStack('MyApi.json', { Resources: { GraphQLSchema: v1SchemaResource } });
    expect(isMigratingFromV1SchemaLogicalId(apiResourceDir)).toBe(true);
  });

  it('returns false for a born-v2 deployed template with the CDK-hashed schema logical ID', () => {
    writeRootTemplate({ Resources: { GraphQLAPITransformerSchema3CB2AE18: v1SchemaResource } });
    expect(isMigratingFromV1SchemaLogicalId(apiResourceDir)).toBe(false);
  });

  it('returns false when GraphQLSchema exists but is not an AppSync schema resource', () => {
    writeRootTemplate({ Resources: { GraphQLSchema: { Type: 'AWS::SomethingElse' } } });
    expect(isMigratingFromV1SchemaLogicalId(apiResourceDir)).toBe(false);
  });

  it('ignores an unparseable deployed template and fails open (false)', () => {
    fs.writeFileSync(path.join(apiResourceDir, 'build', 'cloudformation-template.json'), 'not json {{{');
    expect(isMigratingFromV1SchemaLogicalId(apiResourceDir)).toBe(false);
  });

  it('returns false when neither root nor child stacks declare the schema', () => {
    writeRootTemplate({ Resources: { SomeOtherResource: { Type: 'AWS::AppSync::GraphQLApi' } } });
    writeChildStack('FunctionDirectiveStack.json', { Resources: { Foo: { Type: 'AWS::Lambda::Function' } } });
    expect(isMigratingFromV1SchemaLogicalId(apiResourceDir)).toBe(false);
  });
});
