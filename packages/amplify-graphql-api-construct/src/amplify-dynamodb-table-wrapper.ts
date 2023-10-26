import { CfnResource } from 'aws-cdk-lib';
import { BillingMode, TableClass } from 'aws-cdk-lib/aws-dynamodb';

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
   * Specify how you are charged for read and write throughput and how you manage capacity.
   */
  set billingMode(billingMode: BillingMode) {
    this.resource.addPropertyOverride('billingMode', billingMode);
  }

  /**
   * Specify the table class.
   */
  set tableClass(tableClass: TableClass) {
    this.resource.addPropertyOverride('tableClass', tableClass);
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

  set provisionedThroughput(provisionedThroughput: ProvisionedThroughput) {
    this.resource.addPropertyOverride('provisionedThroughput', provisionedThroughput);
  }
}
