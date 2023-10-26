import { CfnResource, Stack } from 'aws-cdk-lib';
import { CfnDataSource } from 'aws-cdk-lib/aws-appsync';
import { BillingMode, TableClass } from 'aws-cdk-lib/aws-dynamodb';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AmplifyDynamoDbTableWrapper } from '../amplify-dynamodb-table-wrapper';

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
    let tableWrapper: AmplifyDynamoDbTableWrapper;

    const validateProps = (props: any): void => Template.fromStack(stack).hasResourceProperties('Custom::AmplifyDynamoDBTable', props);

    beforeEach(() => {
      stack = new Stack();
      tableWrapper = new AmplifyDynamoDbTableWrapper(new CfnResource(stack, 'TestResources', { type: 'Custom::AmplifyDynamoDBTable' }));
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

    describe('tableClass', () => {
      it('has no default value', () => {
        validateProps({
          tableClass: Match.absent(),
        });
      });

      it('round trips an updated value', () => {
        tableWrapper.tableClass = TableClass.STANDARD_INFREQUENT_ACCESS;
        validateProps({
          tableClass: 'STANDARD_INFREQUENT_ACCESS',
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
  });
});
