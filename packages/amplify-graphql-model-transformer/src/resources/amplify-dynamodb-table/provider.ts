import { aws_lambda, aws_iam, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Lightweight construct wrapper for custom resource provider 'Custom::AmplifyDynamoDBTable'
 * Encapsulating the entry point (onEventHandler) within this `Provider` construct is necessary
 * to maintain a stable custom resource entry point ARN that is consistent with versions
 * previously deployed with the CDK's provider framework.
 *
 * IMPORTANT: The construct name and lambda function ID should not be changed.
 * These are components that make up the resolved ARN.
 * If you change anything in this construct, be sure to test schema modifications
 * against an already deployed stack using this custom resource.
 */
export class Provider extends Construct {
  public readonly onEventHandler: aws_lambda.Function;
  public readonly isCompleteHandler: aws_lambda.Function;
  public readonly serviceToken: string;

  constructor(scope: Construct, id: string, props: ProviderProps) {
    super(scope, id);

    this.onEventHandler = this.createFunction('onEvent', props.lambdaCode, props.onEventHandlerName, props.onEventRole);
    this.isCompleteHandler = this.createFunction('isComplete', props.lambdaCode, props.isCompleteHandlerName, props.isCompleteRole);
    this.serviceToken = this.onEventHandler.functionArn;
  }

  private createFunction = (entrypoint: string, code: aws_lambda.AssetCode, handler: string, role: aws_iam.IRole): aws_lambda.Function => {
    const fn = new aws_lambda.Function(this, `framework-${entrypoint}`, {
      code: code,
      description: `AmplifyManagedTable - ${entrypoint} (${this.node.path})`.slice(0, 256),
      runtime: new aws_lambda.Runtime('nodejs22.x', aws_lambda.RuntimeFamily.NODEJS, { supportsInlineCode: true }),
      handler,
      timeout: Duration.minutes(14),
      role,
    });

    return fn;
  };
}

export interface ProviderProps {
  readonly lambdaCode: aws_lambda.AssetCode;
  readonly onEventHandlerName: string;
  readonly onEventRole: aws_iam.IRole;
  readonly isCompleteHandlerName: string;
  readonly isCompleteRole: aws_iam.IRole;
}
