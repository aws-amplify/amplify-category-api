// The contents of this file were adapted from the AWS CDK provider framework.
// https://github.com/aws/aws-cdk/blob/c52ff08cfd1515d35feb93bcba34a3231a94985c/packages/aws-cdk-lib/custom-resources/lib/provider-framework/waiter-state-machine.ts

import { aws_iam, aws_lambda, CfnResource, Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface WaiterStateMachineProps {
  /**
   * The main handler that notifies if the waiter to decide 'complete' or 'incomplete'.
   */
  readonly isCompleteHandler: aws_lambda.IFunction;

  /**
   * The handler to call if the waiter times out and is incomplete.
   */
  // readonly timeoutHandler: aws_lambda.IFunction;

  /**
   * The interval to wait between attempts.
   */
  readonly queryInterval: Duration;

  /**
   * Number of attempts.
   */
  readonly maxAttempts: number;

  /**
   * Backoff between attempts.
   */
  readonly backoffRate: number;
}

export class WaiterStateMachine extends Construct {
  public readonly stateMachineArn: string;

  constructor(scope: Construct, id: string, props: WaiterStateMachineProps) {
    super(scope, id);

    const role = new aws_iam.Role(this, 'Role', {
      assumedBy: new aws_iam.ServicePrincipal('states.amazonaws.com'),
    });
    props.isCompleteHandler.grantInvoke(role);

    const definition = Stack.of(this).toJsonString({
      StartAt: 'framework-isComplete-task',
      States: {
        'framework-isComplete-task': {
          End: true,
          Retry: [
            {
              ErrorEquals: ['States.ALL'],
              IntervalSeconds: props.queryInterval.toSeconds(),
              MaxAttempts: props.maxAttempts,
              BackoffRate: props.backoffRate,
            },
          ],
          Type: 'Task',
          Resource: props.isCompleteHandler.functionArn,
        },
      },
    });

    const resource = new CfnResource(this, 'Resource', {
      type: 'AWS::StepFunctions::StateMachine',
      properties: {
        DefinitionString: definition,
        RoleArn: role.roleArn,
      },
    });
    resource.node.addDependency(role);
    this.stateMachineArn = resource.ref;
  }

  public grantStartExecution(identity: aws_iam.IGrantable): aws_iam.Grant {
    return aws_iam.Grant.addToPrincipal({
      grantee: identity,
      actions: ['states:StartExecution'],
      resourceArns: [this.stateMachineArn],
    });
  }
}
