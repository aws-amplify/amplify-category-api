import { Stack, aws_iam, aws_lambda } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import path from 'path';
import { Provider } from '../resources/amplify-dynamodb-table/provider';

test('if isComplete is specified, the isComplete framework handler is also included', () => {
  // GIVEN
  const stack = new Stack();
  const lambdaCode = aws_lambda.Code.fromAsset(
    path.join(__dirname, '..', '..', 'lib', 'resources', 'amplify-dynamodb-table', 'amplify-table-manager-lambda'),
    { exclude: ['*.ts'] },
  );

  const onEventRole = new aws_iam.Role(stack, 'OnEventRole', {
    assumedBy: new aws_iam.ServicePrincipal('lambda.amazonaws.com'),
    managedPolicies: [aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
  });

  const isCompleteRole = new aws_iam.Role(stack, 'IsCompleteRole', {
    assumedBy: new aws_iam.ServicePrincipal('lambda.amazonaws.com'),
    managedPolicies: [aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
  });

  // WHEN
  new Provider(stack, 'MyProvider', {
    lambdaCode,
    onEventHandlerName: 'amplify-table-manager-handler.onEvent',
    onEventRole,
    isCompleteHandlerName: 'amplify-table-manager-handler.isComplete',
    isCompleteRole,
  });

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'amplify-table-manager-handler.onEvent',
    Timeout: 840,
    Role: { 'Fn::GetAtt': ['OnEventRole56094035', 'Arn'] },
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'amplify-table-manager-handler.isComplete',
    Timeout: 840,
    Role: { 'Fn::GetAtt': ['IsCompleteRole3501BB5A', 'Arn'] },
  });
});
