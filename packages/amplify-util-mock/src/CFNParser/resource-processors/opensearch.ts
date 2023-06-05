import { CloudFormationParseContext } from '../types';
import { CloudFormationResource, ProcessedOpenSearchDomain } from '../stack/types';

/**
 *
 * @param resourceName
 * @param resource
 * @param cfnContext
 */
export const openSearchDomainHandler = (
  resourceName: string,
  resource: CloudFormationResource,
  cfnContext: CloudFormationParseContext,
): ProcessedOpenSearchDomain => ({
  cfnExposedAttributes: { Arn: 'arn', DomainArn: 'arn', DomainEndpoint: 'endpoint' },
  arn: `arn:aws:es:{aws-region}:{aws-account-number}:domain/${resourceName}`,
  ref: resourceName,
  endpoint: 'localhost:9200',
});
