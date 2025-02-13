import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class StringParameterTemplateValueMapperConstruct extends Construct {
  parameterMap: Record<string, StringParameter>;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.parameterMap = {};
  }
}
