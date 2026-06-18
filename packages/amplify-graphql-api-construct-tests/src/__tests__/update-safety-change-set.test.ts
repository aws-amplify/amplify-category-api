import * as path from 'path';
import {
  CloudFormationClient,
  DeleteChangeSetCommand,
  DescribeChangeSetCommand,
  ResourceChange,
} from '@aws-sdk/client-cloudformation';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import {
  cdkDeploy,
  cdkDestroy,
  cdkPrepareChangeSet,
  initMinimalCDKProject,
  updateCDKAppWithTemplate,
} from '../commands';
import { DURATION_1_HOUR, DURATION_30_MINUTES } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

const stackPrefix = process.env.AMPLIFY_STACK_PREFIX ?? `AmplifyPreviewUpdateSafety-${Date.now()}`;
const region = process.env.CLI_REGION || process.env.AWS_REGION || 'us-west-2';
const changeSetName = `${stackPrefix}-expanded`;
const cloudFormation = new CloudFormationClient({ region });

const describePreparedChangeSet = async (): Promise<ResourceChange[]> => {
  const response = await cloudFormation.send(
    new DescribeChangeSetCommand({
      StackName: stackPrefix,
      ChangeSetName: changeSetName,
    }),
  );

  return (response.Changes ?? []).flatMap((change) => (change.ResourceChange ? [change.ResourceChange] : []));
};

const deletePreparedChangeSet = async (): Promise<void> => {
  try {
    await cloudFormation.send(
      new DeleteChangeSetCommand({
        StackName: stackPrefix,
        ChangeSetName: changeSetName,
      }),
    );
  } catch (_) {
    /* The change set may not exist if deployment failed before creation. */
  }
};

const resourceIdentity = (resource: ResourceChange): string =>
  [resource.LogicalResourceId, resource.PhysicalResourceId, resource.ResourceType].filter(Boolean).join(':');

describe('update safety change set', () => {
  let projRoot: string;

  beforeEach(async () => {
    projRoot = await createNewProjectDir(stackPrefix);
  });

  afterEach(async () => {
    await deletePreparedChangeSet();

    try {
      await cdkDestroy(projRoot, '--all');
    } catch (_) {
      /* Keep cleanup best-effort so assertion failures still surface. */
    }

    deleteProjectDir(projRoot);
  });

  test('does not replace or delete existing stateful resources when expanding a previously deployed schema', async () => {
    const baselineTemplatePath = path.resolve(path.join(__dirname, 'backends', 'update-safety-baseline'));
    const expandedTemplatePath = path.resolve(path.join(__dirname, 'backends', 'update-safety-expanded'));

    await initMinimalCDKProject(projRoot, baselineTemplatePath, { construct: 'Data' });
    await cdkDeploy(projRoot, '--all', { timeoutMs: DURATION_30_MINUTES });

    updateCDKAppWithTemplate(projRoot, expandedTemplatePath);
    await cdkPrepareChangeSet(projRoot, '--all', changeSetName, { timeoutMs: DURATION_30_MINUTES });

    const resourceChanges = await describePreparedChangeSet();
    const statefulReplacements = resourceChanges.filter(
      (change) =>
        change.Replacement === 'True' &&
        (change.ResourceType === 'AWS::DynamoDB::Table' || change.ResourceType === 'Custom::AmplifyDynamoDBTable'),
    );
    const statefulDeletes = resourceChanges.filter(
      (change) =>
        change.Action === 'Remove' &&
        (change.ResourceType === 'AWS::DynamoDB::Table' || change.ResourceType === 'Custom::AmplifyDynamoDBTable'),
    );
    const existingNestedStackDeletes = resourceChanges.filter(
      (change) =>
        change.Action === 'Remove' &&
        change.ResourceType === 'AWS::CloudFormation::Stack' &&
        /Existing(A|B|C)/.test(resourceIdentity(change)),
    );

    expect(statefulReplacements).toEqual([]);
    expect(statefulDeletes).toEqual([]);
    expect(existingNestedStackDeletes).toEqual([]);
  });
});
