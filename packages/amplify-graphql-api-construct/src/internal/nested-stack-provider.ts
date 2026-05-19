import { CfnParameter, CfnParameterProps, Fn, NestedStack, Stack, StackProps, Token } from 'aws-cdk-lib';
import { NestedStackProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { Construct } from 'constructs';

// Keep parent templates small and deploy overflow groups as separate CloudFormation stack operations.
const MAX_DIRECT_NESTED_STACKS = 5;
const MAX_GROUPED_NESTED_STACKS = 5;
const MAX_CLOUDFORMATION_STACK_NAME_LENGTH = 128;
const GROUP_STACK_PREFIX = 'AmplifyGraphqlApiStackGroup';
export const GRAPHQL_API_STACK_GROUP_METADATA = 'aws-amplify:graphql-api-stack-group-root';

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
 * Keeps large generated APIs from overflowing CloudFormation template and stack operation limits.
 */
export class ShardedNestedStackProvider implements NestedStackProvider {
  private directNestedStackCount = 0;

  private currentGroupStack: Stack | undefined;

  private previousGroupStack: Stack | undefined;

  private currentGroupNestedStackCount = 0;

  private nextGroupStackIndex = 1;

  private readonly topLevelStack: Stack;

  private readonly stackGroupScope: Construct;

  constructor(private readonly rootScope: Construct) {
    this.topLevelStack = getTopLevelStack(rootScope);
    this.stackGroupScope = (this.topLevelStack.node.scope ?? this.topLevelStack.node.root) as Construct;
  }

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
      this.currentGroupStack = this.createGroupStack();
      this.addDynamoDBParameterPassthrough(this.currentGroupStack);
      this.nextGroupStackIndex += 1;
      this.currentGroupNestedStackCount = 0;
    }

    this.currentGroupNestedStackCount += 1;
    return this.currentGroupStack;
  };

  private createGroupStack = (): Stack => {
    const groupStackIndex = this.nextGroupStackIndex;
    const groupStackEnv =
      !Token.isUnresolved(this.topLevelStack.account) && !Token.isUnresolved(this.topLevelStack.region)
        ? {
            account: this.topLevelStack.account,
            region: this.topLevelStack.region,
          }
        : undefined;
    const stackProps: StackProps = {
      ...(groupStackEnv ? { env: groupStackEnv } : {}),
      stackName: this.createGroupStackName(groupStackIndex),
    };

    const groupStack = new Stack(
      this.stackGroupScope,
      `${GROUP_STACK_PREFIX}${this.rootScope.node.addr.slice(-8)}${groupStackIndex}`,
      stackProps,
    );

    groupStack.node.addMetadata(GRAPHQL_API_STACK_GROUP_METADATA, this.rootScope.node.addr);
    groupStack.addDependency(this.topLevelStack);

    if (this.previousGroupStack) {
      groupStack.addDependency(this.previousGroupStack);
    }

    this.previousGroupStack = groupStack;

    return groupStack;
  };

  private createGroupStackName = (groupStackIndex: number): string | undefined => {
    const rootStackName = this.topLevelStack.stackName;
    if (Token.isUnresolved(rootStackName)) {
      return undefined;
    }

    const suffix = `${GROUP_STACK_PREFIX}${groupStackIndex}`;
    const maxRootStackNameLength = MAX_CLOUDFORMATION_STACK_NAME_LENGTH - suffix.length - 1;
    return `${rootStackName.slice(0, maxRootStackNameLength)}-${suffix}`;
  };

  private addDynamoDBParameterPassthrough = (groupStack: Stack): void => {
    DYNAMO_DB_PASSTHROUGH_PARAMETERS.forEach(({ name, props }) => {
      new CfnParameter(groupStack, name, props);
      if (NestedStack.isNestedStack(groupStack)) {
        groupStack.setParameter(name, Fn.ref(name));
      }
    });
  };
}

export const getTopLevelStack = (scope: Construct): Stack => {
  let currentStack = Stack.of(scope);

  while (currentStack.nestedStackResource && currentStack.node.scope) {
    currentStack = Stack.of(currentStack.node.scope);
  }

  return currentStack;
};
