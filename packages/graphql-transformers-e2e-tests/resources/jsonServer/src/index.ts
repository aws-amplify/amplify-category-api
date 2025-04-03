import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';

export class JsonMockStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const jsonLambda = new lambda.Function(this, 'jsonServerFunction', {
      code: new lambda.AssetCode('src-server'),
      handler: 'index.handler',
      runtime: new lambda.Runtime('nodejs22.x', lambda.RuntimeFamily.NODEJS, { supportsInlineCode: true }),
    });

    const api = new apigateway.LambdaRestApi(this, 'jsonMockApi', {
      handler: jsonLambda,
    });
  }
}

const app = new cdk.App();

new JsonMockStack(app, 'JsonMockStack');

app.synth();
