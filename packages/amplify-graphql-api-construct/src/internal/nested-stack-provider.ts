import { CfnParameter, CfnParameterProps, Fn, NestedStack, Stack } from 'aws-cdk-lib';
import { NestedStackProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Construct } from 'constructs';

// Keep parent templates small and reduce the resource count pressure of each generated stack group.
const MAX_DIRECT_NESTED_STACKS = 50;
const MAX_GROUPED_NESTED_STACKS = 50;
const GROUP_STACK_PREFIX = 'AmplifyGraphqlApiStackGroup';

const DYNAMO_DB_PASSTHROUGH_PARAMETERS: Array<{ name: string; props: CfnParameterProps }> = [
  {
    name: 'DynamoDBModelTableReadIOPS',
    props: {
      type: 'Number',
      default: 5,
      description: 'The number of read IOPS the table should support.',
    },
  },
  {
    name: 'DynamoDBModelTableWriteIOPS',
    props: {
      type: 'Number',
      default: 5,
      description: 'The number of write IOPS the table should support.',
    },
  },
  {
    name: 'DynamoDBBillingMode',
    props: {
      type: 'String',
      default: 'PAY_PER_REQUEST',
      allowedValues: ['PAY_PER_REQUEST', 'PROVISIONED'],
      description: 'Configure @model types to create DynamoDB tables with PAY_PER_REQUEST or PROVISIONED billing modes.',
    },
  },
  {
    name: 'DynamoDBEnablePointInTimeRecovery',
    props: {
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
      description: 'Whether to enable Point in Time Recovery on the table.',
    },
  },
  {
    name: 'DynamoDBEnableServerSideEncryption',
    props: {
      type: 'String',
      default: 'true',
      allowedValues: ['true', 'false'],
      description: 'Enable server side encryption powered by KMS.',
    },
  },
];

/**
 * Keeps large generated APIs from overflowing the parent CloudFormation template with nested stack declarations.
 */
export class ShardedNestedStackProvider implements NestedStackProvider {
  private directNestedStackCount = 0;

  private currentGroupStack: NestedStack | undefined;

  private currentGroupNestedStackCount = 0;

  private nextGroupStackIndex = 1;

  constructor(private readonly rootScope: Construct) {}

  provide = (scope: Construct, name: string): Stack => {
    return new NestedStack(this.getParentScope(scope), name);
  };

  private getParentScope = (scope: Construct): Construct => {
    if (scope !== this.rootScope) {
      return scope;
    }

    if (this.directNestedStackCount < MAX_DIRECT_NESTED_STACKS) {
      this.directNestedStackCount += 1;
      return scope;
    }

    if (!this.currentGroupStack || this.currentGroupNestedStackCount >= MAX_GROUPED_NESTED_STACKS) {
      this.currentGroupStack = new NestedStack(scope, `${GROUP_STACK_PREFIX}${this.nextGroupStackIndex}`);
      this.addDynamoDBParameterPassthrough(this.currentGroupStack);
      this.nextGroupStackIndex += 1;
      this.currentGroupNestedStackCount = 0;
    }

    this.currentGroupNestedStackCount += 1;
    return this.currentGroupStack;
  };

  private addDynamoDBParameterPassthrough = (groupStack: NestedStack): void => {
    DYNAMO_DB_PASSTHROUGH_PARAMETERS.forEach(({ name, props }) => {
      new CfnParameter(groupStack, name, props);
      groupStack.setParameter(name, Fn.ref(name));
    });
  };
}
