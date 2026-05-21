import { CfnParameter, CfnParameterProps, Fn, NestedStack, Stack, StackProps, Token } from 'aws-cdk-lib';
import { NestedStackProvider, NestedStackProviderOptions } from '@aws-amplify/graphql-transformer-interfaces';
import { Construct } from 'constructs';

// Keep parent templates small and deploy overflow groups as separate CloudFormation stack operations.
export const DEFAULT_NESTED_STACK_RESOURCE_ESTIMATE = 400;
export const DEFAULT_STACK_OPERATION_RESOURCE_BUDGET = 2000;
const MAX_CLOUDFORMATION_STACK_NAME_LENGTH = 128;
const GROUP_STACK_PREFIX = 'AmplifyGraphqlApiStackGroup';
export const GRAPHQL_API_STACK_GROUP_METADATA = 'aws-amplify:graphql-api-stack-group-root';

export type ShardedNestedStackProviderOptions = {
  directOperationResourceBudget?: number;
  groupedOperationResourceBudget?: number;
  defaultNestedStackResourceEstimate?: number;
  groupAllRootNestedStacks?: boolean;
};

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
  private directOperationResourceEstimate = 0;

  private currentGroupStack: Stack | undefined;

  private previousGroupStack: Stack | undefined;

  private currentGroupOperationResourceEstimate = 0;

  private nextGroupStackIndex = 1;

  private readonly topLevelStack: Stack;

  private readonly stackGroupScope: Construct;

  private readonly directOperationResourceBudget: number;

  private readonly groupedOperationResourceBudget: number;

  private readonly defaultNestedStackResourceEstimate: number;

  private readonly groupAllRootNestedStacks: boolean;

  constructor(private readonly rootScope: Construct, options: ShardedNestedStackProviderOptions = {}) {
    this.topLevelStack = getTopLevelStack(rootScope);
    this.stackGroupScope = (this.topLevelStack.node.scope ?? this.topLevelStack.node.root) as Construct;
    this.directOperationResourceBudget = normalizeResourceEstimate(
      options.directOperationResourceBudget ?? DEFAULT_STACK_OPERATION_RESOURCE_BUDGET,
    );
    this.groupedOperationResourceBudget = normalizeResourceEstimate(
      options.groupedOperationResourceBudget ?? DEFAULT_STACK_OPERATION_RESOURCE_BUDGET,
    );
    this.defaultNestedStackResourceEstimate = normalizeResourceEstimate(
      options.defaultNestedStackResourceEstimate ?? DEFAULT_NESTED_STACK_RESOURCE_ESTIMATE,
    );
    this.groupAllRootNestedStacks = options.groupAllRootNestedStacks ?? false;
  }

  provide = (scope: Construct, name: string, options?: NestedStackProviderOptions): Stack => {
    return new NestedStack(this.getParentScope(scope, options?.estimatedResourceCount), name);
  };

  private getParentScope = (scope: Construct, estimatedResourceCount?: number): Construct => {
    if (scope !== this.rootScope) {
      return scope;
    }

    const nestedStackResourceEstimate = normalizeResourceEstimate(estimatedResourceCount ?? this.defaultNestedStackResourceEstimate);
    if (
      !this.groupAllRootNestedStacks &&
      this.canAddToOperation(this.directOperationResourceEstimate, nestedStackResourceEstimate, this.directOperationResourceBudget)
    ) {
      this.directOperationResourceEstimate += nestedStackResourceEstimate;
      return scope;
    }

    if (
      !this.currentGroupStack ||
      !this.canAddToOperation(this.currentGroupOperationResourceEstimate, nestedStackResourceEstimate, this.groupedOperationResourceBudget)
    ) {
      this.currentGroupStack = this.createGroupStack();
      this.addDynamoDBParameterPassthrough(this.currentGroupStack);
      this.nextGroupStackIndex += 1;
      this.currentGroupOperationResourceEstimate = 0;
    }

    this.currentGroupOperationResourceEstimate += nestedStackResourceEstimate;
    return this.currentGroupStack;
  };

  private canAddToOperation = (currentResourceEstimate: number, nextResourceEstimate: number, operationBudget: number): boolean =>
    currentResourceEstimate === 0 || currentResourceEstimate + nextResourceEstimate <= operationBudget;

  private createGroupStack = (): Stack => {
    const groupStackIndex = this.nextGroupStackIndex;
    const groupStackEnv = {
      ...(!Token.isUnresolved(this.topLevelStack.account) ? { account: this.topLevelStack.account } : {}),
      ...(!Token.isUnresolved(this.topLevelStack.region) ? { region: this.topLevelStack.region } : {}),
    };
    const stackProps: StackProps = {
      ...(Object.keys(groupStackEnv).length > 0 ? { env: groupStackEnv } : {}),
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

const normalizeResourceEstimate = (estimate: number): number => Math.max(1, Math.ceil(estimate));
