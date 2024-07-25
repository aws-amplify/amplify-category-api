const getParamMock = jest.fn(); // Mock must be declared before imports: https://jestjs.io/docs/manual-mocks#using-with-es-module-imports

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { printer, prompter } from '@aws-amplify/amplify-prompts';
import { pathManager, FeatureFlags } from '@aws-amplify/amplify-cli-core';
import { attemptV2TransformerMigration, revertV2Migration } from '../../schema-migrator';

jest.mock('@aws-amplify/amplify-prompts');
const prompter_mock = prompter as jest.Mocked<typeof prompter>;
prompter_mock.confirmContinue.mockResolvedValue(true);

jest.mock('@aws-amplify/amplify-environment-parameters', () => ({
  getEnvParamManager: jest.fn().mockReturnValue({
    getResourceParamManager: jest.fn().mockReturnValue({
      getParam: getParamMock,
    }),
  }),
}));

const testProjectPath = path.resolve(__dirname, 'mock-projects', 'v1-schema-project');

const resourceDir = (projectDir: string) => path.join(projectDir, 'amplify', 'backend', 'api', 'testapi');
const cliJsonPath = (projectDir: string) => path.join(projectDir, 'amplify', 'cli.json');
const apiName = 'testapi';
const envName = 'testtest';

describe('attemptV2TransformerMigration', () => {
  let tempProjectDir: string;
  beforeEach(async () => {
    const randomSuffix = (Math.random() * 10000).toString().split('.')[0];
    tempProjectDir = path.join(os.tmpdir(), `schema-migrator-test-${randomSuffix}`);
    await fs.copy(testProjectPath, tempProjectDir);
    jest.spyOn(pathManager, 'findProjectRoot').mockReturnValue(tempProjectDir);
    // used by pathManager
    // Will remove when removing pathManager
    FeatureFlags.initialize({ getCurrentEnvName: () => envName });
  });

  afterEach(async () => {
    await fs.remove(tempProjectDir);
  });

  it('migrates schemas and sets FF', async () => {
    const apiResourceDir = resourceDir(tempProjectDir);
    await attemptV2TransformerMigration(apiResourceDir, apiName, { transformerVersion: 1, improvePluralization: true }, envName);
    expect(await fs.readFile(path.join(apiResourceDir, 'schema', 'Mud.graphql'), 'utf8')).toMatchInlineSnapshot(`
      "type Mud @model @auth(rules: [{allow: public}]) {
        id: ID!
        obligations: [Obligation] @hasMany(indexName: \\"byMud\\", fields: [\\"id\\"])
      }
      "
    `);
    expect(await fs.readFile(path.join(apiResourceDir, 'schema', 'nested', 'Obligation.graphql'), 'utf8')).toMatchInlineSnapshot(`
      "type Obligation @model @auth(rules: [{allow: public}]) {
        id: ID!
        mudID: ID @index(name: \\"byMud\\", sortKeyFields: [\\"content\\"])
        content: String
      }
      "
    `);
    const cliJsonFile = await fs.readJSON(cliJsonPath(tempProjectDir), { encoding: 'utf8' });
    expect(cliJsonFile.features.graphqltransformer.useexperimentalpipelinedtransformer).toBe(true);
    expect(cliJsonFile.features.graphqltransformer.transformerversion).toBe(2);
    expect(cliJsonFile.features.graphqltransformer.suppressschemamigrationprompt).toBe(true);
    expect(cliJsonFile.features.codegen.useappsyncmodelgenplugin).toBe(true);
  });

  it('leaves project unchanged when migrating and rolling back', async () => {
    const apiResourceDir = resourceDir(tempProjectDir);
    await attemptV2TransformerMigration(apiResourceDir, apiName, { transformerVersion: 1, improvePluralization: true }, envName);
    await revertV2Migration(apiResourceDir, envName);
    const projectSchema1 = await fs.readFile(path.join(apiResourceDir, 'schema', 'Mud.graphql'), 'utf8');
    const projectSchema2 = await fs.readFile(path.join(apiResourceDir, 'schema', 'nested', 'Obligation.graphql'), 'utf8');
    const projectCliJson = await fs.readJSON(cliJsonPath(tempProjectDir), { encoding: 'utf8' });

    const origApiResourceDir = resourceDir(testProjectPath);
    const originalSchema1 = await fs.readFile(path.join(origApiResourceDir, 'schema', 'Mud.graphql'), 'utf8');
    const originalSchema2 = await fs.readFile(path.join(origApiResourceDir, 'schema', 'nested', 'Obligation.graphql'), 'utf8');
    const originalCliJson = await fs.readJSON(cliJsonPath(testProjectPath), { encoding: 'utf8' });

    expect(projectSchema1).toEqual(originalSchema1);
    expect(projectSchema2).toEqual(originalSchema2);
    expect(projectCliJson).toEqual(originalCliJson);
  });

  it('succeeds but warns when overwritten resolvers are detected', async () => {
    const apiResourceDir = resourceDir(tempProjectDir);
    const resolversDir = path.join(apiResourceDir, 'resolvers');
    const overwrittenPath = path.join(resolversDir, 'Query.listTodos.postAuth.2.req.vtl');

    fs.mkdirSync(resolversDir);
    fs.writeFileSync(overwrittenPath, '{}');
    await attemptV2TransformerMigration(apiResourceDir, apiName, { transformerVersion: 1, improvePluralization: true }, envName);
    expect(printer.info).toHaveBeenCalledWith(expect.stringMatching('You have overridden an Amplify generated resolver'));

    const cliJsonFile = await fs.readJSON(cliJsonPath(tempProjectDir), { encoding: 'utf8' });
    expect(cliJsonFile.features.graphqltransformer.useexperimentalpipelinedtransformer).toBe(true);
    expect(cliJsonFile.features.graphqltransformer.transformerversion).toBe(2);
    expect(cliJsonFile.features.graphqltransformer.suppressschemamigrationprompt).toBe(true);
    expect(cliJsonFile.features.codegen.useappsyncmodelgenplugin).toBe(true);
  });

  it('succeeds but warns when custom roots/resolvers are detected', async () => {
    const apiResourceDir = resourceDir(tempProjectDir);
    const schemaPath = path.join(apiResourceDir, 'schema', 'schema.graphql');

    fs.writeFileSync(schemaPath, 'type Query { listFoos: String }');
    await attemptV2TransformerMigration(apiResourceDir, apiName, { transformerVersion: 1, improvePluralization: true }, envName);
    expect(printer.info).toHaveBeenCalledWith(
      expect.stringMatching('You have defined custom Queries, Mutations, and/or Subscriptions in your GraphQL schema'),
    );

    const cliJsonFile = await fs.readJSON(cliJsonPath(tempProjectDir), { encoding: 'utf8' });
    expect(cliJsonFile.features.graphqltransformer.useexperimentalpipelinedtransformer).toBe(true);
    expect(cliJsonFile.features.graphqltransformer.transformerversion).toBe(2);
    expect(cliJsonFile.features.graphqltransformer.suppressschemamigrationprompt).toBe(true);
    expect(cliJsonFile.features.codegen.useappsyncmodelgenplugin).toBe(true);
  });

  it('succeeds but warns when improvePluralization FF is false', async () => {
    const apiResourceDir = resourceDir(tempProjectDir);
    let cliJsonFile = await fs.readJSON(cliJsonPath(tempProjectDir), { encoding: 'utf8' });

    await fs.writeJSON(cliJsonPath(tempProjectDir), cliJsonFile);
    await attemptV2TransformerMigration(apiResourceDir, apiName, { transformerVersion: 1, improvePluralization: false }, envName);
    expect(printer.info).toHaveBeenCalledWith(expect.stringMatching('You do not have the "improvePluralization" Feature Flag enabled'));

    cliJsonFile = await fs.readJSON(cliJsonPath(tempProjectDir), { encoding: 'utf8' });
    expect(cliJsonFile.features.graphqltransformer.useexperimentalpipelinedtransformer).toBe(true);
    expect(cliJsonFile.features.graphqltransformer.transformerversion).toBe(2);
    expect(cliJsonFile.features.graphqltransformer.suppressschemamigrationprompt).toBe(true);
    expect(cliJsonFile.features.codegen.useappsyncmodelgenplugin).toBe(true);
  });

  it('fails if GQL API is configured to use SQL', async () => {
    getParamMock.mockReturnValueOnce('mockRdsParam');
    const apiResourceDir = resourceDir(tempProjectDir);
    await attemptV2TransformerMigration(apiResourceDir, apiName, { transformerVersion: 1, improvePluralization: true }, envName);
    expect(printer.info).toHaveBeenCalledWith(expect.stringMatching('GraphQL APIs using Aurora RDS cannot be migrated.'));

    const cliJsonFile = await fs.readJSON(cliJsonPath(tempProjectDir), { encoding: 'utf8' });
    expect(cliJsonFile.features.graphqltransformer.useexperimentalpipelinedtransformer).toBe(false);
    expect(cliJsonFile.features.graphqltransformer.transformerversion).toBe(1);
    expect(cliJsonFile.features.graphqltransformer.suppressschemamigrationprompt).toBe(false);
  });

  it('fails if @auth uses queries or mutations', async () => {
    const apiResourceDir = resourceDir(tempProjectDir);
    const schemaPath = path.join(apiResourceDir, 'schema', 'schema.graphql');

    fs.writeFileSync(
      schemaPath,
      `
      type Post @model @auth(rules: [{allow: groups, groups: ["Admin", "Dev"], queries: [get, list], operations: [create, update, delete]}]) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }
    `,
    );
    await attemptV2TransformerMigration(apiResourceDir, apiName, { transformerVersion: 1, improvePluralization: true }, envName);
    expect(printer.info).toHaveBeenCalledWith(expect.stringMatching('You are using queries or mutations in at least one @auth rule.'));

    const cliJsonFile = await fs.readJSON(cliJsonPath(tempProjectDir), { encoding: 'utf8' });
    expect(cliJsonFile.features.graphqltransformer.useexperimentalpipelinedtransformer).toBe(false);
    expect(cliJsonFile.features.graphqltransformer.transformerversion).toBe(1);
    expect(cliJsonFile.features.graphqltransformer.suppressschemamigrationprompt).toBe(false);
  });

  it('Correctly returns the codegen useappsyncmodelgenplugin flag to empty state after @auth queries failure', async () => {
    const apiResourceDir = resourceDir(tempProjectDir);
    const schemaPath = path.join(apiResourceDir, 'schema', 'schema.graphql');

    fs.writeFileSync(
      schemaPath,
      `
      type Post @model @auth(rules: [{allow: groups, groups: ["Admin", "Dev"], queries: [get, list], operations: [create, update, delete]}]) {
        id: ID!
        title: String!
        createdAt: String
        updatedAt: String
      }
    `,
    );
    const improvedPluralizationEnabled = true;
    await attemptV2TransformerMigration(apiResourceDir, apiName, { transformerVersion: 1, improvePluralization: true }, envName);
    expect(printer.info).toHaveBeenCalledWith(expect.stringMatching('You are using queries or mutations in at least one @auth rule.'));

    const cliJsonFile = await fs.readJSON(cliJsonPath(tempProjectDir), { encoding: 'utf8' });
    expect(cliJsonFile.features.graphqltransformer.useexperimentalpipelinedtransformer).toBe(false);
    expect(cliJsonFile.features.graphqltransformer.transformerversion).toBe(1);
    expect(cliJsonFile.features.graphqltransformer.suppressschemamigrationprompt).toBe(false);
    expect(cliJsonFile.features?.codegen?.useappsyncmodelgenplugin).toBeUndefined();
  });
});
