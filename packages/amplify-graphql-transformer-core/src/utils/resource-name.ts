import { ModelDataSourceStrategySqlDbType, SQLLambdaModelDataSourceStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { Construct, MetadataEntry } from 'constructs';
import { ResourceConstants } from 'graphql-transformer-common';

const resourceNameKey = 'graphqltransformer:resourceName';

export type SetResourceNameProps = {
  name: string;
  setOnDefaultChild?: boolean;
};

/**
 * Set a resource name on a provided construct.
 * @param scope the construct to set the resource name on.
 * @param props.name the name to set.
 * @param props.setOnDefaultChild whether to set in the defaultChild or not.
 */
export const setResourceName = (scope: Construct, { name, setOnDefaultChild }: SetResourceNameProps): void => {
  scope.node.addMetadata(resourceNameKey, name);
  if (setOnDefaultChild && scope.node.defaultChild && scope.node.defaultChild) {
    scope.node.defaultChild.node.addMetadata(resourceNameKey, name);
  }
};

/**
 * Retrieve
 * @param metadata the metadata to attempt and pull the resource name
 * @returns the resource name if found, else undefined value
 */
const tryAndRetrieveResourceName = (metadata: MetadataEntry): string | undefined =>
  metadata.type === resourceNameKey && typeof metadata.data === 'string' ? metadata.data : undefined;

/**
 * Utility method to filter undefined values, and winnow string types down.
 * @param x the value to check
 * @returns a boolean and type hint indicating if the value is defined
 */
const isDefined = (x: string | undefined): x is string => x !== undefined;

/**
 * Retrieve the resource name for a given resource if one can be found.
 * @param scope the construct to check for a resource name
 * @returns the resource name as a string if found, else undefined
 */
export const getResourceName = (scope: Construct): string | undefined => {
  const referencesWithName = scope.node.metadata.map(tryAndRetrieveResourceName).filter(isDefined);
  if (referencesWithName.length > 1) throw new Error('Multiple metadata entries specifying a resource name were found, expected 0 or 1.');
  return referencesWithName.length === 1 ? referencesWithName[0] : undefined;
};

/**
 * Names for the resources created for a SQL-based ModelDataSourceStrategy.
 */
export interface SQLLambdaResourceNames {
  /** The Logical ID of the Aurora DSQL cluster created for {@link AuroraDsqlModelDataSourceStrategy} data sources */
  auroraDsqlCluster: string;

  /** The Logical ID of the alias created if a customer specifies a provisioned concurrency configuration */
  sqlLambdaAliasLogicalId: string;

  /**
   * The name of the alias created if a customer specifies a provisioned concurrency configuration. The name portion is appended to the
   * function URL, and should be quite short, to avoid the 140 character maximum limit on function ARN length. Since the function ARN
   * includes the strategy name, and the Alias name is appended to it, the alias name does not need to include the strategy name.
   */
  sqlLambdaAliasName: string;

  /** The AppSync DataSource */
  sqlLambdaDataSource: string;

  /** The SQL Lambda execution role */
  sqlLambdaExecutionRole: string;

  /** The Lambda LayerVersion of the latest SQL Lambda that manages connections and SQL requests to the backing database */
  sqlLambdaLayerVersion: string;

  /**
   * The inline policy attached SQL Lambda execution role. In addition to providing the usual log access, this policy grants read access to
   * SSM so the Lambda can retrieve database connection parameters.
   */
  sqlLambdaExecutionRolePolicy: string;

  /** The function that actually makes SQL requests to the backing database */
  sqlLambdaFunction: string;

  /**
   * A mapping that stores LayerVersion ARNs by region. The Gen1 resource generator updates this map at deployment time by retrieving the
   * latest manifests from an S3 bucket.
   */
  sqlLayerVersionMapping: string;

  /**
   * A mapping that stores Patching SNS Topic ARNs by region. The Gen1 resource generator updates this map at deployment time by retrieving
   * the latest manifests from an S3 bucket.
   */
  sqlSNSTopicArnMapping: string;

  /** In the CDK construct flow, Lambda Layer versions are resolved by a custom resource with this name. */
  sqlLayerVersionResolverCustomResource: string;

  /** The patching Lambda execution role */
  sqlPatchingLambdaExecutionRole: string;

  /**
   * The inline policy of the patching Lambda execution role. Despite the name, this policy also grants UpdateFunctionConfiguration on the
   * SQL Lambda, and allows the patching Lambda to get current layer versions of the SQL Lambda Layer.
   */
  sqlPatchingLambdaExecutionRolePolicy: string;

  /**
   * The patching Lambda function. When triggered by messages on the SQLPatchingTopic, this function updates the SQL Lambda with the
   * latest version of the SQL Lambda Layer.
   */
  sqlPatchingLambdaFunction: string;

  /** The customer subscription to the Amplify Notification Topic */
  sqlPatchingSubscription: string;

  /** The CDK logical ID of the topic imported from the Amplify Notification Topic ARN */
  sqlPatchingTopic: string;

  /** SQL patching lambda's SNS Topic ARN is resolved by a custom resource with this name. */
  sqlSNSTopicARNResolverCustomResource: string;

  /** The name of the stack holding the SQL Lambda and associated resources */
  sqlStack: string;

  /**
   * A prefix for VPC service endpoints that allow the SQL Lambda to retrieve SSM parameters without sending traffic to the public SSM
   * endpoints.
   */
  sqlVpcEndpointPrefix: string;
}

/**
 * The name of the strategy created during the Gen1 CLI import flow.
 */
export const getDefaultStrategyNameForDbType = (dbType: ModelDataSourceStrategySqlDbType): string => `${dbType}Strategy`;

/**
 * Returns resource names created for the given strategy. These are used as the logical IDs for the CDK resources themselves.
 */
export const getResourceNamesForStrategy = (strategy: SQLLambdaModelDataSourceStrategy): SQLLambdaResourceNames =>
  getResourceNamesForStrategyName(strategy.name);

/**
 * Returns resource names created for the given strategy name. These are used as the logical IDs for the CDK resources themselves.
 */
export const getResourceNamesForStrategyName = (strategyName: string): SQLLambdaResourceNames => {
  const sqlLambdaFunction = `SQLFunction${strategyName}`;
  const resourceNames: SQLLambdaResourceNames = {
    auroraDsqlCluster: `DsqlCluster${strategyName}`,
    sqlLambdaAliasLogicalId: `${sqlLambdaFunction}ProvConcurAlias`,
    sqlLambdaAliasName: 'PCAlias',
    sqlLambdaDataSource: `SQLLambdaDataSource${strategyName}`,
    sqlLambdaExecutionRole: `SQLLambdaRole${strategyName}`,
    sqlLambdaLayerVersion: `SQLLambdaLayerVersion${strategyName}`,
    sqlLambdaExecutionRolePolicy: `SQLLambdaRolePolicy${strategyName}`,
    sqlLambdaFunction,
    sqlLayerVersionMapping: `SQLLayerVersionMapping${strategyName}`,
    sqlSNSTopicArnMapping: `SQLSNSTopicArnMapping${strategyName}`,
    sqlLayerVersionResolverCustomResource: `SQLLayerVersionCustomResource${strategyName}`,
    sqlPatchingLambdaExecutionRole: `SQLPatchingLambdaRole${strategyName}`,
    sqlPatchingLambdaExecutionRolePolicy: `SQLPatchingLambdaRolePolicy${strategyName}`,
    sqlPatchingLambdaFunction: `SQLLambdaLayerPatchingFunction${strategyName}`,
    sqlPatchingSubscription: `SQLLambdaLayerPatchingSubscription${strategyName}`,
    sqlPatchingTopic: `SQLLambdaLayerPatchingTopic${strategyName}`,
    sqlSNSTopicARNResolverCustomResource: `SQLLambdaLayerPatchingTopicARNResolver${strategyName}`,
    sqlStack: `SQLApiStack${strategyName}`,
    sqlVpcEndpointPrefix: `SQLVpcEndpoint${strategyName}`,
  };

  return resourceNames;
};
