import { CloudFormationResource, ProcessedOpenSearchDomain } from '../stack/types';
import { CloudFormationParseContext } from '../types';

export const openSearchDomainHandler = (
  resourceName: string,
  resource: CloudFormationResource,
  cfnContext: CloudFormationParseContext,
): ProcessedOpenSearchDomain => {
  return {
    cfnExposedAttributes: { Arn: 'arn', DomainArn: 'arn', DomainEndpoint: 'endpoint' },
    arn: `arn:aws:es:{aws-region}:{aws-account-number}:domain/${resourceName}`,
    ref: resourceName,
    endpoint: 'localhost:9200',
  };
};
