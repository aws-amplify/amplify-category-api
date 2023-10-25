/**
 * VPC config required to deploy a Lambda function in a VPC. The Lambda will be deployed into the specified VPC, subnets, and security
 * groups. The specified subnets and security groups must be in the same VPC. The VPC must have at least one subnet. The construct will also
 * create VPC endpoints in the specified subnets, as well as inbound security rules to allow traffic on port 443 within each security group,
 * to allow the Lambda to read database connection information from Secure Systems Manager.
 * @experimental
 */
export type VpcConfig = {
  vpcId: string;
  subnetAvailabilityZoneConfig: SubnetAvailabilityZone[];
  securityGroupIds: string[];
};

/**
 * Subnet configuration for VPC endpoints used by a Lambda resolver for a SQL-based data source. Although it is possible to create multiple
 * subnets in a single availability zone, VPC service endpoints may only be deployed to a single subnet in a given availability zone. This
 * structure ensures that the Lambda function and VPC service endpoints are mutually consistent.
 * @experimental
 */
export interface SubnetAvailabilityZone {
  /** The subnet ID to install the Lambda data source in. */
  readonly subnetId: string;

  /** The availability zone of the subnet. */
  readonly availabilityZone: string;
}
