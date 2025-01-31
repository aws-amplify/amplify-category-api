import * as fs from 'node:fs';
import * as path from 'node:path';
import { getResourceNamesForStrategyName } from '@aws-amplify/graphql-transformer-core';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { DURATION_1_HOUR } from '../utils/duration-constants';
import { cdkDeploy, cdkDestroy, initCDKProject } from '../commands';

jest.setTimeout(DURATION_1_HOUR);

describe('CDK GraphQL Transformer deployments with DSQL datasource', () => {
  // TODO: At the time of this writing, DSQL is in preview and only supported in us-east-1 & us-east-2. Long term we should respect the
  // region.
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const projFolderName = 'dsqlbasic';
  const strategyName = 'dsqlDbStrategy';
  let projRoot: string;
  let projName: string;
  let cdkOutputs: any;

  /**
   * Sets up the initial CDK project with a blank GraphQL API and the DSQL cluster. We'll set up the actual schema and DDL later.
   */
  beforeAll(async () => {
    const templatePath = path.resolve(path.join(__dirname, '..', '__tests__', 'backends', 'dsql-stack'));
    projRoot = await createNewProjectDir(projFolderName);
    const cdkConstructRootPath = path.join(__dirname, '..', '..', '..', 'amplify-graphql-api-construct', 'dist', 'js');
    const cdkConstructPath = fs.readdirSync(cdkConstructRootPath).filter((fileName) => fileName.match(/\.tgz/))[0];

    const databaseConstructRootPath = path.join(__dirname, '..', '..', '..', 'amplify-database-construct', 'dist', 'js');
    const databaseConstructPath = fs.readdirSync(databaseConstructRootPath).filter((fileName) => fileName.match(/\.tgz/))[0];

    console.log(`cdkConstructPath: ${cdkConstructPath}`);
    console.log(`databaseConstructPath: ${databaseConstructPath}`);
    projName = await initCDKProject(projRoot, templatePath, {
      additionalDependencies: [cdkConstructPath, databaseConstructPath],
    });

    cdkOutputs = await cdkDeploy(projRoot, '--all');
  });

  // afterAll(async () => {
  //   try {
  //     await cdkDestroy(projRoot, '--all');
  //   } catch (err) {
  //     console.log(`Error invoking 'cdk destroy': ${err}`);
  //   }

  //   deleteProjectDir(projRoot);
  // });

  test('Basic DSQL functionality', async () => {
    const outputs = cdkOutputs[projName];
    const resourceNames = getResourceNamesForStrategyName(strategyName);
    expect(outputs).toBeDefined();
    // assert other outputs:
    // - DSQL cluster
    // - DSQL IAM role
  });
});
