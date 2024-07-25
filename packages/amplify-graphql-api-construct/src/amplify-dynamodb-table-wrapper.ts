import { CfnResource, RemovalPolicy } from 'aws-cdk-lib';
import { BillingMode, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';

const AMPLIFY_DYNAMODB_TABLE_RESOURCE_TYPE = 'Custom::AmplifyDynamoDBTable';

/**
 * Shape for TTL config.
 */
export interface TimeToLiveSpecification {
  /**
   * Boolean determining if the ttl is enabled or not.
   */
  readonly enabled: boolean;

  /**
   * Attribute name to apply to the ttl spec.
   */
  readonly attributeName?: string;
}

/**
 * Wrapper for provisioned throughput config in DDB.
 */
export interface ProvisionedThroughput {
  /**
   * The read capacity units on the table or index.
   */
  readonly readCapacityUnits: number;

  /**
   * The write capacity units on the table or index.
   */
  readonly writeCapacityUnits: number;
}

/**
 * Server Side Encryption Type Values
 * - `KMS` - Server-side encryption that uses AWS KMS. The key is stored in your account and is managed by KMS (AWS KMS charges apply).
 */
export enum SSEType {
  KMS = 'KMS',
}

/**
 * Represents the settings used to enable server-side encryption.
 */
export interface SSESpecification {
  /**
   * Indicates whether server-side encryption is done using an AWS managed key or an AWS owned key.
   * If enabled (true), server-side encryption type is set to `KMS` and an AWS managed key is used ( AWS KMS charges apply).
   * If disabled (false) or not specified, server-side encryption is set to AWS owned key.
   */
  readonly sseEnabled: boolean;

  /**
   * The AWS KMS key that should be used for the AWS KMS encryption.
   * To specify a key, use its key ID, Amazon Resource Name (ARN), alias name, or alias ARN. Note that you should only provide
   * this parameter if the key is different from the default DynamoDB key `alias/aws/dynamodb` .
   */
  readonly kmsMasterKeyId?: string;

  /**
   * Server-side encryption type. The only supported value is:
   * `KMS` Server-side encryption that uses AWS Key Management Service.
   *   The key is stored in your account and is managed by AWS KMS ( AWS KMS charges apply).
   */
  readonly sseType?: SSEType;
}

/**
 * Represents the DynamoDB Streams configuration for a table in DynamoDB.
 */
export interface StreamSpecification {
  /**
   * When an item in the table is modified, `StreamViewType` determines what information is written to the stream for this table.
   * Valid values for `StreamViewType` are:
   * - `KEYS_ONLY` - Only the key attributes of the modified item are written to the stream.
   * - `NEW_IMAGE` - The entire item, as it appears after it was modified, is written to the stream.
   * - `OLD_IMAGE` - The entire item, as it appeared before it was modified, is written to the stream.
   * - `NEW_AND_OLD_IMAGES` - Both the new and the old item images of the item are written to the stream.
   */
  readonly streamViewType: StreamViewType;
}

/**
 * Wrapper class around Custom::AmplifyDynamoDBTable custom resource, to simplify
 * the override experience a bit. This is NOT a construct, just an easier way to access
 * the generated construct.
 * This is a wrapper intended to mimic the `aws_cdk_lib.aws_dynamodb.Table` functionality more-or-less.
 * Notable differences is the addition of TKTK properties, to account for the fact that they're constructor props
 * in the CDK construct, as well as the removal of all from*, grant*, and metric* methods implemented by Table.
 */
export class AmplifyDynamoDbTableWrapper {
  /**
   * Return true and perform type narrowing if a given input appears to be capable of
   * @param x the object to check.
   * @returns whether or not the resource is an underlying amplify dynamodb table resource.
   */
  static isAmplifyDynamoDbTableResource(x: any): x is CfnResource {
    return x instanceof CfnResource && x.cfnResourceType === AMPLIFY_DYNAMODB_TABLE_RESOURCE_TYPE;
  }

  /**
   * Create the wrapper given an underlying CfnResource that is an instance of Custom::AmplifyDynamoDBTable.
   * @param resource the Cfn resource.
   */
  constructor(private readonly resource: CfnResource) {
    if (resource.cfnResourceType !== AMPLIFY_DYNAMODB_TABLE_RESOURCE_TYPE) {
      throw new Error(`Only CfnResource with type ${AMPLIFY_DYNAMODB_TABLE_RESOURCE_TYPE} can be used in AmplifyDynamoDbTable`);
    }
  }

  /**
   * Set the deletion policy of the resource based on the removal policy specified.
   * @param policy removal policy to set
   */
  applyRemovalPolicy(policy: RemovalPolicy): void {
    this.resource.applyRemovalPolicy(policy);
  }

  /**
   * Specify how you are charged for read and write throughput and how you manage capacity.
   */
  set billingMode(billingMode: BillingMode) {
    this.resource.addPropertyOverride('billingMode', billingMode);
  }

  /**
   * The name of TTL attribute.
   */
  set timeToLiveAttribute(timeToLiveSpecification: TimeToLiveSpecification) {
    this.resource.addPropertyOverride('timeToLiveSpecification', timeToLiveSpecification);
  }

  /**
   * Whether point-in-time recovery is enabled.
   */
  set pointInTimeRecoveryEnabled(pointInTimeRecoveryEnabled: boolean) {
    this.resource.addPropertyOverride('pointInTimeRecoverySpecification', { pointInTimeRecoveryEnabled });
  }

  /**
   * Update the provisioned throughput for the base table.
   */
  set provisionedThroughput(provisionedThroughput: ProvisionedThroughput) {
    this.resource.addPropertyOverride('provisionedThroughput', provisionedThroughput);
  }

  /**
   * Set the provisionedThroughtput for a specified GSI by name.
   * @param indexName the index to specify a provisionedThroughput config for
   * @param provisionedThroughput the config to set
   */
  setGlobalSecondaryIndexProvisionedThroughput(indexName: string, provisionedThroughput: ProvisionedThroughput): void {
    const gsis: Array<[string, { indexName: string }]> = Object.entries(
      (this.resource as any).rawOverrides?.Properties?.globalSecondaryIndexes ?? {},
    );
    const foundGsis = gsis.filter(([_, gsiConfig]) => indexName === gsiConfig.indexName).map(([gsiIndex]) => gsiIndex);
    if (foundGsis.length !== 1) {
      throw new Error(`Index with name ${indexName} not found in table definition`);
    }
    this.resource.addPropertyOverride(`globalSecondaryIndexes.${foundGsis[0]}.provisionedThroughput`, provisionedThroughput);
  }

  /**
   * Set the ddb stream specification on the table.
   */
  set streamSpecification(streamSpecification: StreamSpecification) {
    this.resource.addPropertyOverride('streamSpecification', streamSpecification);
  }

  /**
   * Set the ddb server-side encryption specification on the table.
   */
  set sseSpecification(sseSpecification: SSESpecification) {
    this.resource.addPropertyOverride('sseSpecification', sseSpecification);
  }

  /**
   * Set table deletion protection.
   */
  set deletionProtectionEnabled(deletionProtectionEnabled: boolean) {
    this.resource.addPropertyOverride('deletionProtectionEnabled', deletionProtectionEnabled);
  }
}
