import { CfnResource, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { CfnDataSource } from 'aws-cdk-lib/aws-appsync';
import { BillingMode, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AmplifyDynamoDbTableWrapper, SSEType } from '../amplify-dynamodb-table-wrapper';

describe('AmplifyDynamoDbTable', () => {
  describe('isAmplifyDynamoDbTableResource', () => {
    it('returns true for a custom resource type', () => {
      expect(
        AmplifyDynamoDbTableWrapper.isAmplifyDynamoDbTableResource(
          new CfnResource(new Stack(), 'TestCustomResource', {
            type: 'Custom::AmplifyDynamoDBTable',
          }),
        ),
      ).toEqual(true);
    });

    it('returns false for a non-custom-resource', () => {
      expect(
        AmplifyDynamoDbTableWrapper.isAmplifyDynamoDbTableResource(
          new CfnResource(new Stack(), 'TestResource', {
            type: 'AWS::AppSync::Resolver',
          }),
        ),
      ).toEqual(false);
    });

    it('returns false for a non-CfnResource', () => {
      expect(
        AmplifyDynamoDbTableWrapper.isAmplifyDynamoDbTableResource(
          new CfnDataSource(new Stack(), 'NoneDS', {
            apiId: 'OUR_API',
            name: 'NONE_DS',
            type: 'NONE',
          }),
        ),
      ).toEqual(false);
    });
  });

  describe('constructor validation', () => {
    it('throws on non-CfnResource', () => {
      expect(
        () =>
          new AmplifyDynamoDbTableWrapper(
            new CfnDataSource(new Stack(), 'NoneDS', {
              apiId: 'OUR_API',
              name: 'NONE_DS',
              type: 'NONE',
            }),
          ),
      ).toThrowErrorMatchingInlineSnapshot('"Only CfnResource with type Custom::AmplifyDynamoDBTable can be used in AmplifyDynamoDbTable"');
    });

    it('throws on non-custom-resource', () => {
      expect(
        () =>
          new AmplifyDynamoDbTableWrapper(
            new CfnResource(new Stack(), 'TestResource', {
              type: 'AWS::AppSync::Resolver',
            }),
          ),
      ).toThrowErrorMatchingInlineSnapshot('"Only CfnResource with type Custom::AmplifyDynamoDBTable can be used in AmplifyDynamoDbTable"');
    });

    it('succeeds on custom resource type', () => {
      new AmplifyDynamoDbTableWrapper(
        new CfnResource(new Stack(), 'TestCustomResource', {
          type: 'Custom::AmplifyDynamoDBTable',
        }),
      );
    });
  });

  describe('wrapped operations', () => {
    let stack: Stack;
    let testResource: CfnResource;
    let tableWrapper: AmplifyDynamoDbTableWrapper;

    const validateProps = (props: any): void => Template.fromStack(stack).hasResourceProperties('Custom::AmplifyDynamoDBTable', props);

    beforeEach(() => {
      stack = new Stack();
      testResource = new CfnResource(stack, 'TestResources', { type: 'Custom::AmplifyDynamoDBTable' });
      tableWrapper = new AmplifyDynamoDbTableWrapper(testResource);
    });

    describe('billingMode', () => {
      it('has no default value', () => {
        validateProps({
          billingMode: Match.absent(),
        });
      });

      it('round trips an updated value', () => {
        tableWrapper.billingMode = BillingMode.PROVISIONED;
        validateProps({
          billingMode: 'PROVISIONED',
        });
      });
    });

    describe('timeToLiveAttribute', () => {
      it('has no default value', () => {
        validateProps({
          timeToLiveSpecification: Match.absent(),
        });
      });

      it('round trips an updated value when set', () => {
        tableWrapper.timeToLiveAttribute = { enabled: true, attributeName: '_ttl' };
        validateProps({
          timeToLiveSpecification: { enabled: true, attributeName: '_ttl' },
        });
      });

      it('round trips an updated value when unset', () => {
        tableWrapper.timeToLiveAttribute = { enabled: false };
        validateProps({
          timeToLiveSpecification: { enabled: false },
        });
      });
    });

    describe('pointInTimeRecovery', () => {
      it('has no default value', () => {
        validateProps({
          pointInTimeRecoverySpecification: Match.absent(),
        });
      });

      it('round trips a value when enabled', () => {
        tableWrapper.pointInTimeRecoveryEnabled = true;
        validateProps({
          pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
        });
      });

      it('round trips a value when disabled', () => {
        tableWrapper.pointInTimeRecoveryEnabled = false;
        validateProps({
          pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false },
        });
      });
    });

    describe('provisionedThroughput', () => {
      it('has no default value', () => {
        validateProps({
          provisionedThroughput: Match.absent(),
        });
      });

      it('round trips a value when enabled', () => {
        tableWrapper.provisionedThroughput = {
          readCapacityUnits: 8,
          writeCapacityUnits: 9,
        };
        validateProps({
          provisionedThroughput: {
            readCapacityUnits: 8,
            writeCapacityUnits: 9,
          },
        });
      });
    });

    describe('setGlobalSecondaryIndexProvisionedThroughput', () => {
      it('overwrites the specified index', () => {
        testResource.addPropertyOverride('globalSecondaryIndexes.0', {
          indexName: 'firstIndex',
          keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
          projection: { projectionType: 'ALL' },
          provisionedThroughput: {
            readCapacityUnits: 5,
            writeCapacityUnits: 5,
          },
        });
        testResource.addPropertyOverride('globalSecondaryIndexes.1', {
          indexName: 'secondIndex',
          keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
          projection: { projectionType: 'ALL' },
          provisionedThroughput: {
            readCapacityUnits: 5,
            writeCapacityUnits: 5,
          },
        });
        tableWrapper.setGlobalSecondaryIndexProvisionedThroughput('secondIndex', {
          readCapacityUnits: 10,
          writeCapacityUnits: 10,
        });
        validateProps({
          globalSecondaryIndexes: {
            '0': {
              indexName: 'firstIndex',
              provisionedThroughput: {
                readCapacityUnits: 5,
                writeCapacityUnits: 5,
              },
            },
            '1': {
              indexName: 'secondIndex',
              provisionedThroughput: {
                readCapacityUnits: 10,
                writeCapacityUnits: 10,
              },
            },
          },
        });
      });

      it('throws on unexpected index name', () => {
        expect(() =>
          tableWrapper.setGlobalSecondaryIndexProvisionedThroughput('unknownIndex', {
            readCapacityUnits: 10,
            writeCapacityUnits: 10,
          }),
        ).toThrowErrorMatchingInlineSnapshot('"Index with name unknownIndex not found in table definition"');
      });
    });

    describe('streamSpecification', () => {
      it('has no default value', () => {
        validateProps({
          streamSpecification: Match.absent(),
        });
      });

      it('round trips a value when enabled', () => {
        tableWrapper.streamSpecification = {
          streamViewType: StreamViewType.KEYS_ONLY,
        };
        validateProps({
          streamSpecification: {
            streamViewType: StreamViewType.KEYS_ONLY,
          },
        });
      });
    });

    describe('sseSpecification', () => {
      it('has no default value', () => {
        validateProps({
          sseSpecification: Match.absent(),
        });
      });

      it('round trips a value when disabled', () => {
        tableWrapper.sseSpecification = {
          sseEnabled: false,
        };
        validateProps({
          sseSpecification: {
            sseEnabled: false,
          },
        });
      });

      it('round trips a value when enabled', () => {
        tableWrapper.sseSpecification = {
          sseEnabled: true,
          sseType: SSEType.KMS,
        };
        validateProps({
          sseSpecification: {
            sseEnabled: true,
            sseType: SSEType.KMS,
          },
        });
      });
    });

    describe('deletionProtectionEnabled', () => {
      it('has no default value', () => {
        validateProps({
          deletionProtectionEnabled: Match.absent(),
        });
      });

      it('round trips a value when enabled', () => {
        tableWrapper.deletionProtectionEnabled = true;
        validateProps({
          deletionProtectionEnabled: true,
        });
      });

      it('round trips a value when disabled', () => {
        tableWrapper.deletionProtectionEnabled = false;
        validateProps({
          deletionProtectionEnabled: false,
        });
      });
    });

    describe('applyRemovalPolicy', () => {
      it('overrides the removal policy', () => {
        testResource.applyRemovalPolicy(RemovalPolicy.DESTROY);
        expect(testResource.cfnOptions.deletionPolicy).toBe('Delete');
        expect(testResource.cfnOptions.updateReplacePolicy).toBe('Delete');
        tableWrapper.applyRemovalPolicy(RemovalPolicy.RETAIN);
        expect(testResource.cfnOptions.deletionPolicy).toBe('Retain');
        expect(testResource.cfnOptions.updateReplacePolicy).toBe('Retain');
      });
    });
  });
});
