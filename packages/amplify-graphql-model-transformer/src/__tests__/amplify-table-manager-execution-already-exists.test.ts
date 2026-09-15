import { StartExecutionInput } from '@aws-sdk/client-sfn';
import * as ddbTableManagerLambda from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/amplify-table-manager-handler';
import * as outbound from '../resources/amplify-dynamodb-table/amplify-table-manager-lambda/outbound';

jest.spyOn(ddbTableManagerLambda, 'getLambdaTags').mockReturnValue(Promise.resolve([]));

const mockDescribeTable = jest.fn();
const mockDescribeContinuousBackups = jest.fn();
const mockUpdateContinuousBackups = jest.fn();
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => {
  return {
    ...jest.requireActual('@aws-sdk/client-dynamodb'),
    DynamoDB: jest.fn().mockImplementation(() => ({
      describeTable: (input: any) => mockDescribeTable(input),
      describeContinuousBackups: (input: any) => mockDescribeContinuousBackups(input),
      updateContinuousBackups: (input: any) => mockUpdateContinuousBackups(input),
      send: (input: any) => mockSend(input),
    })),
  };
});

const TABLE_ARN = 'arn:aws:dynamodb:us-east-1:123456789100:table/mockTable';
const CFN_REQUEST_ID = 'a1b2c3d4-1111-2222-3333-444455556666';

/**
 * Minimal stand-in for the Step Functions StandardState machine name-uniqueness window.
 * The real service keeps execution names unique for ~90 days on STANDARD state machines and
 * rejects a duplicate name with `ExecutionAlreadyExists`.
 */
class FakeStepFunctions {
  private readonly startedExecutionNames = new Set<string>();

  startExecution = async (req: StartExecutionInput): Promise<{ executionArn: string; startDate: Date }> => {
    const name = req.name;
    if (name !== undefined) {
      if (this.startedExecutionNames.has(name)) {
        const error: Error & { name: string; code?: string } = new Error(
          `Execution Already Exists: 'arn:aws:states:us-east-1:123456789100:execution:waiter:${name}'`,
        );
        error.name = 'ExecutionAlreadyExists';
        error.code = 'ExecutionAlreadyExists';
        throw error;
      }
      this.startedExecutionNames.add(name);
    }
    return {
      executionArn: `arn:aws:states:us-east-1:123456789100:execution:waiter:${name ?? `auto-${this.startedExecutionNames.size}`}`,
      startDate: new Date(),
    };
  };
}

const pitrUpdateEvent = (): AWSLambda.CloudFormationCustomResourceEvent =>
  ({
    RequestType: 'Update',
    ServiceToken: 'arn:aws:lambda:us-east-1:123456789100:function:TableManagerCustomProviderframeworkonEvent',
    ResponseURL: 'https://cloudformation-custom-resource-response.example.com/mock',
    StackId: 'mockStackId',
    RequestId: CFN_REQUEST_ID,
    LogicalResourceId: 'ResourceTable',
    ResourceType: 'Custom::AmplifyDynamoDBTable',
    PhysicalResourceId: 'mockTable',
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:123456789100:function:TableManagerCustomProviderframeworkonEvent',
      tableName: 'mockTable',
      attributeDefinitions: [{ attributeName: 'pk', attributeType: 'S' }],
      keySchema: [{ attributeName: 'pk', keyType: 'HASH' }],
      billingMode: 'PAY_PER_REQUEST',
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    },
    OldResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:123456789100:function:TableManagerCustomProviderframeworkonEvent',
      tableName: 'mockTable',
      attributeDefinitions: [{ attributeName: 'pk', attributeType: 'S' }],
      keySchema: [{ attributeName: 'pk', keyType: 'HASH' }],
      billingMode: 'PAY_PER_REQUEST',
    },
  } as unknown as AWSLambda.CloudFormationCustomResourceEvent);

const lambdaContext = {
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789100:function:TableManagerCustomProviderframeworkonEvent',
};

describe('waiter state machine execution naming (P489859831 / #1047)', () => {
  let fakeSfn: FakeStepFunctions;
  let startExecutionSpy: jest.Mock;
  let cfnResponses: any[];
  const originalStartExecution = outbound.startExecution;
  const originalHttpRequest = outbound.httpRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WAITER_STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:123456789100:stateMachine:waiter';

    fakeSfn = new FakeStepFunctions();
    startExecutionSpy = jest.fn((req: StartExecutionInput) => fakeSfn.startExecution(req));
    (outbound as any).startExecution = startExecutionSpy;

    cfnResponses = [];
    (outbound as any).httpRequest = jest.fn(async (_options: any, body: string) => {
      cfnResponses.push(JSON.parse(body));
    });

    mockDescribeTable.mockResolvedValue({
      Table: {
        TableName: 'mockTable',
        TableArn: TABLE_ARN,
        TableStatus: 'ACTIVE',
        KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }],
        BillingModeSummary: { BillingMode: 'PAY_PER_REQUEST' },
      },
    });
    mockDescribeContinuousBackups.mockResolvedValue({
      ContinuousBackupsDescription: {
        ContinuousBackupsStatus: 'ENABLED',
        PointInTimeRecoveryDescription: { PointInTimeRecoveryStatus: 'DISABLED' },
      },
    });
    mockUpdateContinuousBackups.mockResolvedValue({
      ContinuousBackupsDescription: {
        ContinuousBackupsStatus: 'ENABLED',
        PointInTimeRecoveryDescription: { PointInTimeRecoveryStatus: 'ENABLED' },
      },
    });
    mockSend.mockResolvedValue({ Tags: [] });
  });

  afterEach(() => {
    (outbound as any).startExecution = originalStartExecution;
    (outbound as any).httpRequest = originalHttpRequest;
    delete process.env.WAITER_STATE_MACHINE_ARN;
  });

  it('a CloudFormation retry with the same RequestId no longer fails with ExecutionAlreadyExists', async () => {
    await ddbTableManagerLambda.onEvent(pitrUpdateEvent(), lambdaContext);
    await ddbTableManagerLambda.onEvent(pitrUpdateEvent(), lambdaContext);

    expect(startExecutionSpy).toHaveBeenCalledTimes(2);

    // The handler must not pin the execution name to the CFN RequestId, otherwise the second
    // (retried) invocation lands inside the Step Functions name-uniqueness window.
    expect(startExecutionSpy.mock.calls[0][0].name).toBeUndefined();
    expect(startExecutionSpy.mock.calls[1][0].name).toBeUndefined();

    // Both waiter executions started, so nothing was reported back to CloudFormation yet:
    // completion is reported later by the waiter state machine, not by onEvent.
    expect(cfnResponses).toHaveLength(0);
    expect(cfnResponses.filter((response) => response.Status === 'FAILED')).toHaveLength(0);
  });

  it('still forwards the state machine arn and the full resource event as waiter input', async () => {
    await ddbTableManagerLambda.onEvent(pitrUpdateEvent(), lambdaContext);

    const waiter = startExecutionSpy.mock.calls[0][0];
    expect(waiter.stateMachineArn).toEqual('arn:aws:states:us-east-1:123456789100:stateMachine:waiter');

    const input = JSON.parse(waiter.input);
    expect(input.RequestId).toEqual(CFN_REQUEST_ID);
    expect(input.PhysicalResourceId).toEqual('mockTable');
    expect(input.StackId).toEqual('mockStackId');
  });

  it('demonstrates why the name had to go: reusing an explicit name throws ExecutionAlreadyExists', async () => {
    const waiter = {
      stateMachineArn: process.env.WAITER_STATE_MACHINE_ARN!,
      name: CFN_REQUEST_ID,
      input: '{}',
    };

    await expect(outbound.startExecution(waiter)).resolves.toBeDefined();
    await expect(outbound.startExecution(waiter)).rejects.toMatchObject({ name: 'ExecutionAlreadyExists' });
  });

  it('omitting `name` (upstream CDK provider-framework behaviour) lets the retry succeed', async () => {
    const withoutName = {
      stateMachineArn: process.env.WAITER_STATE_MACHINE_ARN!,
      input: JSON.stringify({ RequestId: CFN_REQUEST_ID }),
    };

    await expect(outbound.startExecution(withoutName)).resolves.toBeDefined();
    await expect(outbound.startExecution(withoutName)).resolves.toBeDefined();
  });
});
