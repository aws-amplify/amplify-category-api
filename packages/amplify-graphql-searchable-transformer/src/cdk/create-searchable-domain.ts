import { setResourceName } from '@aws-amplify/graphql-transformer-core';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { CfnParameter, Fn, RemovalPolicy } from 'aws-cdk-lib';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { CfnDomain, Domain, ElasticsearchVersion } from 'aws-cdk-lib/aws-elasticsearch';
import { IRole, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ResourceConstants } from 'graphql-transformer-common';

export const createSearchableDomain = (
  stack: Construct,
  parameterMap: Map<string, CfnParameter>,
  apiId: string,
  nodeToNodeEncryption: boolean,
): Domain => {
  const { OpenSearchEBSVolumeGB, OpenSearchInstanceType, OpenSearchInstanceCount } = ResourceConstants.PARAMETERS;
  const { OpenSearchDomainLogicalID } = ResourceConstants.RESOURCES;
  const { HasEnvironmentParameter } = ResourceConstants.CONDITIONS;

  const domain = new Domain(stack, OpenSearchDomainLogicalID, {
    version: { version: '7.10' } as ElasticsearchVersion,
    enforceHttps: true,
    ebs: {
      enabled: true,
      volumeType: EbsDeviceVolumeType.GP2,
      volumeSize: parameterMap.get(OpenSearchEBSVolumeGB)?.valueAsNumber,
    },
    nodeToNodeEncryption,
    zoneAwareness: {
      enabled: false,
    },
    domainName: Fn.conditionIf(HasEnvironmentParameter, Fn.ref('AWS::NoValue'), `d${apiId}`).toString(),
    removalPolicy: RemovalPolicy.DESTROY,
  });

  const cfnDomain = domain.node.defaultChild as CfnDomain;
  setResourceName(domain, { name: OpenSearchDomainLogicalID, setOnDefaultChild: true });

  // CDK started to append hash to logical id of search domain.
  // This line overrides that behavior to avoid deletion and re-creation of existing domains.
  cfnDomain.overrideLogicalId(OpenSearchDomainLogicalID);

  cfnDomain.elasticsearchClusterConfig = {
    instanceCount: parameterMap.get(OpenSearchInstanceCount)?.valueAsNumber,
    instanceType: parameterMap.get(OpenSearchInstanceType)?.valueAsString,
  };

  return domain;
};

export const createSearchableDomainRole = (
  context: TransformerContextProvider,
  stack: Construct,
  parameterMap: Map<string, CfnParameter>,
): IRole => {
  const { OpenSearchAccessIAMRoleLogicalID } = ResourceConstants.RESOURCES;
  const { OpenSearchAccessIAMRoleName } = ResourceConstants.PARAMETERS;
  const roleName = parameterMap.get(OpenSearchAccessIAMRoleName)?.valueAsString;
  if (!roleName) {
    throw new Error(`Could find role name parameter for ${OpenSearchAccessIAMRoleName}`);
  }
  const role = new Role(stack, OpenSearchAccessIAMRoleLogicalID, {
    assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
    roleName: context.resourceHelper.generateIAMRoleName(roleName),
  });
  setResourceName(role, { name: OpenSearchAccessIAMRoleLogicalID, setOnDefaultChild: true });
  return role;
};
