import * as path from 'node:path';
import { Construct } from 'constructs';
import { CfnOutput, CustomResource, Duration, Stack } from 'aws-cdk-lib';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { ManagedPolicy, PolicyDocument, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { AmplifyDatabaseProps, AmplifyDatabaseResources } from './types';

/**
 * A construct that uses an AwsCustomResource framework to create and manage a DSQL cluster.
 */
export class AmplifyDatabase extends Construct {
  /**
   * Generated L1 and L2 CDK resources.
   */
  public readonly resources: AmplifyDatabaseResources;

  /**
   * Reference to parent stack of database construct
   */
  public readonly stack: Stack;

  constructor(scope: Construct, id: string, props: AmplifyDatabaseProps) {
    super(scope, id);
    this.stack = Stack.of(scope);

    const eventHandlerRole = new Role(scope, 'AmplifyDatabaseProviderEventHandlerRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonAuroraDSQLFullAccess'),
      ],
    });

    const isCompleteHandlerRole = new Role(scope, 'AmplifyDatabaseProviderIsCompleteHandlerRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
      inlinePolicies: {
        GetCluster: PolicyDocument.fromJson({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['dsql:GetCluster'],
              Resource: '*',
            },
          ],
        }),
      },
    });

    const provider = new Provider(this, 'AmplifyDatabaseProvider', {
      onEventHandler: new NodejsFunction(this, 'AmplifyDatabaseProviderHandler', {
        entry: path.resolve(__dirname, 'handlers', 'event.ts'),
        role: eventHandlerRole,
        timeout: Duration.seconds(30),
      }),
      isCompleteHandler: new NodejsFunction(this, 'AmplifyDatabaseProviderCompleteHandler', {
        entry: path.resolve(__dirname, 'handlers', 'is-complete.ts'),
        role: isCompleteHandlerRole,
        timeout: Duration.seconds(30),
      }),
    });

    const resource = new CustomResource(this, 'AmplifyDatabaseCustomResource', {
      serviceToken: provider.serviceToken,
      properties: {
        deletionProtectionEnabled: props.deletionProtectionEnabled ?? false,
        name: props.name,
        tags: props.tags,
      },
    });

    this.resources = {
      databaseCluster: {
        arn: resource.getAttString('arn'),
        creationTime: Number(resource.getAtt('creationTime')),
        deletionProtectionEnabled: Boolean(resource.getAtt('deletionProtectionEnabled')),
        identifier: resource.getAtt('identifier').toString(),
        linkedClusterArns: resource.getAtt('linkedClusterArns') as any,
        status: resource.getAtt('status') as any,
        witnessRegion: resource.getAtt('witnessRegion').toString(),
      },
    };

    new CfnOutput(this, 'AmplifyDatabaseArn', {
      key: 'AmplifyDatabaseArn',
      value: this.resources.databaseCluster.arn,
    });

    new CfnOutput(this, 'AmplifyDatabaseIdentifier', {
      key: 'AmplifyDatabaseIdentifier',
      value: this.resources.databaseCluster.identifier,
    });

    new CfnOutput(this, 'AmplifyDatabaseRegion', {
      key: 'AmplifyDatabaseRegion',
      value: this.stack.region,
    });

    new CfnOutput(this, 'AmplifyDatabaseType', {
      key: 'AmplifyDatabaseType',
      value: 'AURORA_DSQL',
    });
  }
}
