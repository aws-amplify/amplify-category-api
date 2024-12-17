import path from 'path';
import * as fs from 'fs-extra';
import {
  addApiWithoutSchema,
  amplifyOverrideApi,
  amplifyPush,
  amplifyPushOverride,
  createNewProjectDir,
  deleteProject,
  deleteProjectDir,
  getAppSyncApi,
  getDDBTable,
  getProjectMeta,
  getRolePolicy,
  initJSProjectWithProfile,
  listRolePolicies,
  listRoleNamesContaining,
  replaceOverrideFileWithProjectInfo,
  updateApiSchema,
  updateSchema,
} from 'amplify-category-api-e2e-core';

describe('Override table name', () => {
  let projRoot: string;
  let projFolderName: string;
  beforeEach(async () => {
    projFolderName = 'overridename';
    projRoot = await createNewProjectDir(projFolderName);
  });

  afterEach(async () => {
    const metaFilePath = path.join(projRoot, 'amplify', '#current-cloud-backend', 'amplify-meta.json');
    if (fs.existsSync(metaFilePath)) {
      await deleteProject(projRoot);
    }
    deleteProjectDir(projRoot);
  });

  it('Generates correct permissions policies for DynamoDB tables with overridden names', async () => {
    const now = Math.floor(Date.now() / 1000);
    const modelName = `Override${now}`;

    const schema = /* GraphQL */ `
      type ${modelName} @model {
        id: ID!
        content: String
      }
    `;

    const envName = 'integtest';
    const projName = 'overridetest';
    const cliInputsFilePath = path.join(projRoot, 'amplify', 'backend', 'api', `${projName}`, 'cli-inputs.json');
    await initJSProjectWithProfile(projRoot, { name: projName, envName });
    await addApiWithoutSchema(projRoot);

    updateSchema(projRoot, projName, schema);
    expect(fs.existsSync(cliInputsFilePath)).toBe(true);

    await amplifyPush(projRoot);

    await amplifyOverrideApi(projRoot, {});

    const overriddenTableName = `OverrideTest${now}Custom`;
    const overrideCode = /* TypeScript */ `
      export function override(props: any) {
        props.models['${modelName}'].modelDDBTable.tableName = '${overriddenTableName}';
      }
    `;
    const destOverrideFilePath = path.join(projRoot, 'amplify', 'backend', 'api', `${projName}`, 'override.ts');
    fs.writeFileSync(destOverrideFilePath, overrideCode);

    await amplifyPushOverride(projRoot);

    const meta = getProjectMeta(projRoot);
    const region = meta.providers.awscloudformation.Region;
    const { output } = meta.api.overridetest;
    const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
    const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, region);

    expect(graphqlApi).toBeDefined();
    expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);
    expect(GraphQLAPIIdOutput).toBeDefined();
    expect(GraphQLAPIEndpointOutput).toBeDefined();
    expect(GraphQLAPIKeyOutput).toBeDefined();

    const defaultTableName = `${modelName}-${graphqlApi.apiId}-${envName}`;
    const error = { message: null };
    try {
      const defaultTable = await getDDBTable(defaultTableName, region);
      expect(defaultTable).toBeUndefined();
    } catch (ex) {
      Object.assign(error, ex);
    }
    expect(error).toBeDefined();
    expect(error.message).toContain(`${defaultTableName} not found`);

    const actualTable = await getDDBTable(overriddenTableName, region);
    expect(actualTable).toBeDefined();

    // Validate policy. The role will be created with the prefix {modelName}IAMRole. It should have 2 policies: one created by Amplify, one
    // created by AppSync's CDK call during the `addDynamoDbDataSource` flow. We expect the policy statements for the latter to refer to the
    // overridden table name.
    const matchingRoleNames = await listRoleNamesContaining(modelName, region);
    expect(matchingRoleNames).toBeDefined();
    expect(matchingRoleNames.length).toEqual(1);
    const roleName = matchingRoleNames[0];

    const policies = await listRolePolicies(roleName, region);
    expect(policies).toBeDefined();
    expect(policies.length).toBe(2);

    const defaultPolicy = policies.find((p) => p.startsWith(`${modelName}IAMRoleDefault`));
    expect(defaultPolicy).toBeDefined();

    const policyObject = await getRolePolicy(roleName, defaultPolicy, region);
    expect(policyObject).toBeDefined();
    expect(policyObject.Statement[0].Resource[0]).toContain(overriddenTableName);
  });
});
