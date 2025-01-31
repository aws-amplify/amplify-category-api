import * as path from 'node:path';
import { Construct } from 'constructs';
import { CfnOutput, CustomResource, Duration, Stack } from 'aws-cdk-lib';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { ManagedPolicy, PolicyDocument, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
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

    const dsqlLayerVersion = LayerVersion.fromLayerVersionArn(
      this,
      'DsqlLayerVersion',
      'arn:aws:lambda:us-east-1:779656175277:layer:nodejs-aws-sdk-layer:1',
    );

    const provider = new Provider(this, 'AmplifyDatabaseProvider', {
      onEventHandler: new NodejsFunction(this, 'AmplifyDatabaseProviderEventHandler', {
        entry: path.join(__dirname, 'handlers', 'event.js'),
        handler: 'handler',
        role: eventHandlerRole,
        runtime: Runtime.NODEJS_20_X,
        timeout: Duration.minutes(1),
        layers: [dsqlLayerVersion],
      }),
      isCompleteHandler: new NodejsFunction(this, 'AmplifyDatabaseProviderIsCompleteHandler', {
        entry: path.join(__dirname, 'handlers', 'is-complete.js'),
        handler: 'handler',
        role: isCompleteHandlerRole,
        runtime: Runtime.NODEJS_20_X,
        timeout: Duration.minutes(1),
        layers: [dsqlLayerVersion],
      }),
    });

    const resource = new CustomResource(this, 'AmplifyDatabaseCustomResource', {
      serviceToken: provider.serviceToken,
      properties: {
        deletionProtectionEnabled: props.deletionProtectionEnabled ?? false,
        name: props.name,
        tags: props.tags,
      },
      resourceType: 'Custom::AmplifyDatabase',
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
