import { CfnOutput, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ResourceConstants } from 'graphql-transformer-common';

export const createStackOutputs = (stack: Construct, endpoint: string, apiId: string, arn: string): void => {
  const { OpenSearchDomainArn, OpenSearchDomainEndpoint } = ResourceConstants.OUTPUTS;
  new CfnOutput(stack, OpenSearchDomainArn, {
    value: arn,
    description: 'OpenSearch instance Domain ARN.',
    exportName: Fn.join(':', [apiId, 'GetAtt', 'OpenSearch', 'DomainArn']).toString(),
  });
  new CfnOutput(stack, OpenSearchDomainEndpoint, {
    value: `https://${endpoint}`,
    description: 'OpenSearch instance Domain Endpoint.',
    exportName: Fn.join(':', [apiId, 'GetAtt', 'OpenSearch', 'DomainEndpoint']).toString(),
  });
};
