/**
 * TYPES BELOW ARE PARTIALLY FORKED FROM CDK
 * These types can be accessed without needing to `import` the module.
 * This is a type definition file that exports the input CFN types for the amplify table properties
 */

export as namespace CustomDDB;

/**
 * The CustomDDB.Input defines how data is stored in the CFN custom resource properties.
 * Changes to this type should be backward compatible with all previous versions.
 */
export type Input = CfnTableProps & {
  /**
   * Determines if a table is allowed for destructive updates. When enabled, the table will be replaced when key schema is changed. This setting is disabled by default.
   */
  allowDestructiveGraphqlSchemaUpdates?: boolean;
  /**
   * Determines if a table is in sandbox mode. When enabled along with 'allowDestructiveGraphqlSchemaUpdates' , the table will be replaced when GSI updates are detected. This setting is disabled by default.
   */
  replaceTableUponGsiUpdate?: boolean;
};

/**
 * Properties for defining a `CfnTable`
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html
 */
export interface CfnTableProps {
  /**
   * Specifies the attributes that make up the primary key for the table. The attributes in the `KeySchema` property must also be defined in the `AttributeDefinitions` property.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-keyschema
   */
  readonly keySchema: Array<KeySchemaProperty>;
  /**
   * A list of attributes that describe the key schema for the table and indexes.
   *
   * This property is required to create a DynamoDB table.
   *
   * Update requires: [Some interruptions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-update-behaviors.html#update-some-interrupt) . Replacement if you edit an existing AttributeDefinition.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-attributedefinitions
   */
  readonly attributeDefinitions?: Array<AttributeDefinitionProperty>;
  /**
   * Specify how you are charged for read and write throughput and how you manage capacity.
   *
   * Valid values include:
   *
   * - `PROVISIONED` - We recommend using `PROVISIONED` for predictable workloads. `PROVISIONED` sets the billing mode to [Provisioned Mode](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html#HowItWorks.ProvisionedThroughput.Manual) .
   * - `PAY_PER_REQUEST` - We recommend using `PAY_PER_REQUEST` for unpredictable workloads. `PAY_PER_REQUEST` sets the billing mode to [On-Demand Mode](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html#HowItWorks.OnDemand) .
   *
   * If not specified, the default is `PROVISIONED` .
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-billingmode
   */
  readonly billingMode?: string;
  /**
   * The settings used to enable or disable CloudWatch Contributor Insights for the specified table.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-contributorinsightsspecification
   */
  readonly contributorInsightsSpecification?: ContributorInsightsSpecificationProperty;
  /**
   * Determines if a table is protected from deletion. When enabled, the table cannot be deleted by any user or process. This setting is disabled by default. For more information, see [Using deletion protection](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.DeletionProtection) in the *Amazon DynamoDB Developer Guide* .
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-deletionprotectionenabled
   */
  readonly deletionProtectionEnabled?: boolean;
  /**
   * Global secondary indexes to be created on the table. You can create up to 20 global secondary indexes.
   *
   * > If you update a table to include a new global secondary index, AWS CloudFormation initiates the index creation and then proceeds with the stack update. AWS CloudFormation doesn't wait for the index to complete creation because the backfilling phase can take a long time, depending on the size of the table. You can't use the index or update the table until the index's status is `ACTIVE` . You can track its status by using the DynamoDB [DescribeTable](https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-table.html) command.
   * >
   * > If you add or delete an index during an update, we recommend that you don't update any other resources. If your stack fails to update and is rolled back while adding a new index, you must manually delete the index.
   * >
   * > Updates are not supported. The following are exceptions:
   * >
   * > - If you update either the contributor insights specification or the provisioned throughput values of global secondary indexes, you can update the table without interruption.
   * > - You can delete or add one global secondary index without interruption. If you do both in the same update (for example, by changing the index's logical ID), the update fails.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-globalsecondaryindexes
   */
  readonly globalSecondaryIndexes?: Array<GlobalSecondaryIndexProperty>;
  /**
   * Specifies the properties of data being imported from the S3 bucket source to the table.
   *
   * > If you specify the `ImportSourceSpecification` property, and also specify either the `StreamSpecification` , the `TableClass` property, or the `DeletionProtectionEnabled` property, the IAM entity creating/updating stack must have `UpdateTable` permission.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-importsourcespecification
   */
  readonly importSourceSpecification?: CfnTable.ImportSourceSpecificationProperty;
  /**
   * The Kinesis Data Streams configuration for the specified table.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-kinesisstreamspecification
   */
  readonly kinesisStreamSpecification?: KinesisStreamSpecificationProperty;
  /**
   * Local secondary indexes to be created on the table. You can create up to 5 local secondary indexes. Each index is scoped to a given hash key value. The size of each hash key can be up to 10 gigabytes.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-localsecondaryindexes
   */
  readonly localSecondaryIndexes?: Array<LocalSecondaryIndexProperty>;
  /**
   * The settings used to enable point in time recovery.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-pointintimerecoveryspecification
   */
  readonly pointInTimeRecoverySpecification?: PointInTimeRecoverySpecificationProperty;
  /**
   * Throughput for the specified table, which consists of values for `ReadCapacityUnits` and `WriteCapacityUnits` . For more information about the contents of a provisioned throughput structure, see [Amazon DynamoDB Table ProvisionedThroughput](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ProvisionedThroughput.html) .
   *
   * If you set `BillingMode` as `PROVISIONED` , you must specify this property. If you set `BillingMode` as `PAY_PER_REQUEST` , you cannot specify this property.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-provisionedthroughput
   */
  readonly provisionedThroughput?: ProvisionedThroughputProperty;
  /**
   * Specifies the settings to enable server-side encryption.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-ssespecification
   */
  readonly sseSpecification?: SSESpecificationProperty;
  /**
   * The settings for the DynamoDB table stream, which capture changes to items stored in the table.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-streamspecification
   */
  readonly streamSpecification?: StreamSpecificationProperty;
  /**
   * The table class of the new table. Valid values are `STANDARD` and `STANDARD_INFREQUENT_ACCESS` .
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-tableclass
   */
  readonly tableClass?: string;
  /**
   * A name for the table. If you don't specify a name, AWS CloudFormation generates a unique physical ID and uses that ID for the table name. For more information, see [Name Type](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-name.html) .
   *
   * > If you specify a name, you cannot perform updates that require replacement of this resource. You can perform updates that require no or some interruption. If you must replace the resource, specify a new name.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-tablename
   */
  readonly tableName?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   *
   * For more information, see [Tag](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html) .
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-tags
   */
  readonly tags?: CfnTag[];
  /**
   * Specifies the Time to Live (TTL) settings for the table.
   *
   * > For detailed information about the limits in DynamoDB, see [Limits in Amazon DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html) in the Amazon DynamoDB Developer Guide.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-timetolivespecification
   */
  readonly timeToLiveSpecification?: TimeToLiveSpecificationProperty;
}
/**
 * Represents *a single element* of a key schema. A key schema specifies the attributes that make up the primary key of a table, or the key attributes of an index.
 *
 * A `KeySchemaElement` represents exactly one attribute of the primary key. For example, a simple primary key would be represented by one `KeySchemaElement` (for the partition key). A composite primary key would require one `KeySchemaElement` for the partition key, and another `KeySchemaElement` for the sort key.
 *
 * A `KeySchemaElement` must be a scalar, top-level attribute (not a nested attribute). The data type must be one of String, Number, or Binary. The attribute cannot be nested within a List or a Map.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-keyschema.html
 */
interface KeySchemaProperty {
  /**
   * The name of a key attribute.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-keyschema.html#cfn-dynamodb-table-keyschema-attributename
   */
  readonly attributeName: string;
  /**
   * The role that this key attribute will assume:
   *
   * - `HASH` - partition key
   * - `RANGE` - sort key
   *
   * > The partition key of an item is also known as its *hash attribute* . The term "hash attribute" derives from DynamoDB's usage of an internal hash function to evenly distribute data items across partitions, based on their partition key values.
   * >
   * > The sort key of an item is also known as its *range attribute* . The term "range attribute" derives from the way DynamoDB stores items with the same partition key physically close together, in sorted order by the sort key value.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-keyschema.html#cfn-dynamodb-table-keyschema-keytype
   */
  readonly keyType: string;
}
/**
 * Represents an attribute for describing the key schema for the table and indexes.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-attributedefinition.html
 */
interface AttributeDefinitionProperty {
  /**
   * A name for the attribute.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-attributedefinition.html#cfn-dynamodb-table-attributedefinition-attributename
   */
  readonly attributeName: string;
  /**
   * The data type for the attribute, where:
   *
   * - `S` - the attribute is of type String
   * - `N` - the attribute is of type Number
   * - `B` - the attribute is of type Binary
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-attributedefinition.html#cfn-dynamodb-table-attributedefinition-attributetype
   */
  readonly attributeType: string;
}
/**
 * Represents the properties of a global secondary index.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-globalsecondaryindex.html
 */
interface GlobalSecondaryIndexProperty {
  /**
   * The settings used to enable or disable CloudWatch Contributor Insights for the specified global secondary index.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-globalsecondaryindex.html#cfn-dynamodb-table-globalsecondaryindex-contributorinsightsspecification
   */
  readonly contributorInsightsSpecification?: ContributorInsightsSpecificationProperty;
  /**
   * The name of the global secondary index. The name must be unique among all other indexes on this table.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-globalsecondaryindex.html#cfn-dynamodb-table-globalsecondaryindex-indexname
   */
  readonly indexName: string;
  /**
   * The complete key schema for a global secondary index, which consists of one or more pairs of attribute names and key types:
   *
   * - `HASH` - partition key
   * - `RANGE` - sort key
   *
   * > The partition key of an item is also known as its *hash attribute* . The term "hash attribute" derives from DynamoDB's usage of an internal hash function to evenly distribute data items across partitions, based on their partition key values.
   * >
   * > The sort key of an item is also known as its *range attribute* . The term "range attribute" derives from the way DynamoDB stores items with the same partition key physically close together, in sorted order by the sort key value.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-globalsecondaryindex.html#cfn-dynamodb-table-globalsecondaryindex-keyschema
   */
  readonly keySchema: Array<KeySchemaProperty>;
  /**
   * Represents attributes that are copied (projected) from the table into the global secondary index. These are in addition to the primary key attributes and index key attributes, which are automatically projected.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-globalsecondaryindex.html#cfn-dynamodb-table-globalsecondaryindex-projection
   */
  readonly projection: ProjectionProperty;
  /**
   * Represents the provisioned throughput settings for the specified global secondary index.
   *
   * For current minimum and maximum provisioned throughput values, see [Service, Account, and Table Quotas](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html) in the *Amazon DynamoDB Developer Guide* .
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-globalsecondaryindex.html#cfn-dynamodb-table-globalsecondaryindex-provisionedthroughput
   */
  readonly provisionedThroughput?: ProvisionedThroughputProperty;
}
/**
 * Represents the properties of a local secondary index. A local secondary index can only be created when its parent table is created.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-localsecondaryindex.html
 */
interface LocalSecondaryIndexProperty {
  /**
   * The name of the local secondary index. The name must be unique among all other indexes on this table.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-localsecondaryindex.html#cfn-dynamodb-table-localsecondaryindex-indexname
   */
  readonly indexName: string;
  /**
   * The complete key schema for the local secondary index, consisting of one or more pairs of attribute names and key types:
   *
   * - `HASH` - partition key
   * - `RANGE` - sort key
   *
   * > The partition key of an item is also known as its *hash attribute* . The term "hash attribute" derives from DynamoDB's usage of an internal hash function to evenly distribute data items across partitions, based on their partition key values.
   * >
   * > The sort key of an item is also known as its *range attribute* . The term "range attribute" derives from the way DynamoDB stores items with the same partition key physically close together, in sorted order by the sort key value.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-localsecondaryindex.html#cfn-dynamodb-table-localsecondaryindex-keyschema
   */
  readonly keySchema: Array<KeySchemaProperty>;
  /**
   * Represents attributes that are copied (projected) from the table into the local secondary index. These are in addition to the primary key attributes and index key attributes, which are automatically projected.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-localsecondaryindex.html#cfn-dynamodb-table-localsecondaryindex-projection
   */
  readonly projection: ProjectionProperty;
}
/**
 * Represents attributes that are copied (projected) from the table into an index. These are in addition to the primary key attributes and index key attributes, which are automatically projected.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-projection.html
 */
interface ProjectionProperty {
  /**
   * Represents the non-key attribute names which will be projected into the index.
   *
   * For local secondary indexes, the total count of `NonKeyAttributes` summed across all of the local secondary indexes, must not exceed 100. If you project the same attribute into two different indexes, this counts as two distinct attributes when determining the total.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-projection.html#cfn-dynamodb-table-projection-nonkeyattributes
   */
  readonly nonKeyAttributes?: string[];
  /**
   * The set of attributes that are projected into the index:
   *
   * - `KEYS_ONLY` - Only the index and primary keys are projected into the index.
   * - `INCLUDE` - In addition to the attributes described in `KEYS_ONLY` , the secondary index will include other non-key attributes that you specify.
   * - `ALL` - All of the table attributes are projected into the index.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-projection.html#cfn-dynamodb-table-projection-projectiontype
   */
  readonly projectionType?: string;
}
/**
 * Throughput for the specified table, which consists of values for `ReadCapacityUnits` and `WriteCapacityUnits` . For more information about the contents of a provisioned throughput structure, see [Amazon DynamoDB Table ProvisionedThroughput](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ProvisionedThroughput.html) .
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-provisionedthroughput.html
 */
interface ProvisionedThroughputProperty {
  /**
   * The maximum number of strongly consistent reads consumed per second before DynamoDB returns a `ThrottlingException` . For more information, see [Specifying Read and Write Requirements](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ProvisionedThroughput.html) in the *Amazon DynamoDB Developer Guide* .
   *
   * If read/write capacity mode is `PAY_PER_REQUEST` the value is set to 0.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-provisionedthroughput.html#cfn-dynamodb-table-provisionedthroughput-readcapacityunits
   */
  readonly readCapacityUnits: number;
  /**
   * The maximum number of writes consumed per second before DynamoDB returns a `ThrottlingException` . For more information, see [Specifying Read and Write Requirements](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ProvisionedThroughput.html) in the *Amazon DynamoDB Developer Guide* .
   *
   * If read/write capacity mode is `PAY_PER_REQUEST` the value is set to 0.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-provisionedthroughput.html#cfn-dynamodb-table-provisionedthroughput-writecapacityunits
   */
  readonly writeCapacityUnits: number;
}
/**
 * The settings used to enable or disable CloudWatch Contributor Insights.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-contributorinsightsspecification.html
 */
interface ContributorInsightsSpecificationProperty {
  /**
   * Indicates whether CloudWatch Contributor Insights are to be enabled (true) or disabled (false).
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-contributorinsightsspecification.html#cfn-dynamodb-table-contributorinsightsspecification-enabled
   */
  readonly enabled: boolean;
}
/**
 * Represents the settings used to enable or disable Time to Live (TTL) for the specified table.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-timetolivespecification.html
 */
interface TimeToLiveSpecificationProperty {
  /**
   * The name of the TTL attribute used to store the expiration time for items in the table.
   *
   * > To update this property, you must first disable TTL then enable TTL with the new attribute name.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-timetolivespecification.html#cfn-dynamodb-table-timetolivespecification-attributename
   */
  readonly attributeName: string;
  /**
   * Indicates whether TTL is to be enabled (true) or disabled (false) on the table.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-timetolivespecification.html#cfn-dynamodb-table-timetolivespecification-enabled
   */
  readonly enabled: boolean;
}
/**
 * Represents the DynamoDB Streams configuration for a table in DynamoDB.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-streamspecification.html
 */
interface StreamSpecificationProperty {
  /**
   * When an item in the table is modified, `StreamViewType` determines what information is written to the stream for this table. Valid values for `StreamViewType` are:
   *
   * - `KEYS_ONLY` - Only the key attributes of the modified item are written to the stream.
   * - `NEW_IMAGE` - The entire item, as it appears after it was modified, is written to the stream.
   * - `OLD_IMAGE` - The entire item, as it appeared before it was modified, is written to the stream.
   * - `NEW_AND_OLD_IMAGES` - Both the new and the old item images of the item are written to the stream.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-streamspecification.html#cfn-dynamodb-table-streamspecification-streamviewtype
   */
  readonly streamViewType: string;
}
/**
 * Represents the settings used to enable server-side encryption.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-ssespecification.html
 */
interface SSESpecificationProperty {
  /**
   * The AWS KMS key that should be used for the AWS KMS encryption. To specify a key, use its key ID, Amazon Resource Name (ARN), alias name, or alias ARN. Note that you should only provide this parameter if the key is different from the default DynamoDB key `alias/aws/dynamodb` .
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-ssespecification.html#cfn-dynamodb-table-ssespecification-kmsmasterkeyid
   */
  readonly kmsMasterKeyId?: string;
  /**
   * Indicates whether server-side encryption is done using an AWS managed key or an AWS owned key. If enabled (true), server-side encryption type is set to `KMS` and an AWS managed key is used ( AWS KMS charges apply). If disabled (false) or not specified, server-side encryption is set to AWS owned key.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-ssespecification.html#cfn-dynamodb-table-ssespecification-sseenabled
   */
  readonly sseEnabled: boolean;
  /**
   * Server-side encryption type. The only supported value is:
   *
   * - `KMS` - Server-side encryption that uses AWS Key Management Service . The key is stored in your account and is managed by AWS KMS ( AWS KMS charges apply).
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-ssespecification.html#cfn-dynamodb-table-ssespecification-ssetype
   */
  readonly sseType?: string;
}
/**
 * The settings used to enable point in time recovery.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-pointintimerecoveryspecification.html
 */
interface PointInTimeRecoverySpecificationProperty {
  /**
   * Indicates whether point in time recovery is enabled (true) or disabled (false) on the table.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-pointintimerecoveryspecification.html#cfn-dynamodb-table-pointintimerecoveryspecification-pointintimerecoveryenabled
   */
  readonly pointInTimeRecoveryEnabled?: boolean;
}
/**
 * The Kinesis Data Streams configuration for the specified table.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-kinesisstreamspecification.html
 */
interface KinesisStreamSpecificationProperty {
  /**
   * The ARN for a specific Kinesis data stream.
   *
   * Length Constraints: Minimum length of 37. Maximum length of 1024.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-kinesisstreamspecification.html#cfn-dynamodb-table-kinesisstreamspecification-streamarn
   */
  readonly streamArn: string;
}
/**
 * Specifies the properties of data being imported from the S3 bucket source to the table.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-importsourcespecification.html
 */
interface ImportSourceSpecificationProperty {
  /**
   * Type of compression to be used on the input coming from the imported table.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-importsourcespecification.html#cfn-dynamodb-table-importsourcespecification-inputcompressiontype
   */
  readonly inputCompressionType?: string;
  /**
   * The format of the source data. Valid values for `ImportFormat` are `CSV` , `DYNAMODB_JSON` or `ION` .
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-importsourcespecification.html#cfn-dynamodb-table-importsourcespecification-inputformat
   */
  readonly inputFormat: string;
  /**
   * Additional properties that specify how the input is formatted,
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-importsourcespecification.html#cfn-dynamodb-table-importsourcespecification-inputformatoptions
   */
  readonly inputFormatOptions?: InputFormatOptionsProperty;
  /**
   * The S3 bucket that provides the source for the import.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-importsourcespecification.html#cfn-dynamodb-table-importsourcespecification-s3bucketsource
   */
  readonly s3BucketSource: S3BucketSourceProperty;
}
/**
 * The format options for the data that was imported into the target table. There is one value, CsvOption.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-inputformatoptions.html
 */
interface InputFormatOptionsProperty {
  /**
   * The options for imported source files in CSV format. The values are Delimiter and HeaderList.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-inputformatoptions.html#cfn-dynamodb-table-inputformatoptions-csv
   */
  readonly csv?: CsvProperty;
}
/**
 * The S3 bucket that is being imported from.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-s3bucketsource.html
 */
interface S3BucketSourceProperty {
  /**
   * The S3 bucket that is being imported from.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-s3bucketsource.html#cfn-dynamodb-table-s3bucketsource-s3bucket
   */
  readonly s3Bucket: string;
  /**
   * The account number of the S3 bucket that is being imported from. If the bucket is owned by the requester this is optional.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-s3bucketsource.html#cfn-dynamodb-table-s3bucketsource-s3bucketowner
   */
  readonly s3BucketOwner?: string;
  /**
   * The key prefix shared by all S3 Objects that are being imported.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-s3bucketsource.html#cfn-dynamodb-table-s3bucketsource-s3keyprefix
   */
  readonly s3KeyPrefix?: string;
}
/**
 * The options for imported source files in CSV format. The values are Delimiter and HeaderList.
 *
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-csv.html
 */
interface CsvProperty {
  /**
   * The delimiter used for separating items in the CSV file being imported.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-csv.html#cfn-dynamodb-table-csv-delimiter
   */
  readonly delimiter?: string;
  /**
   * List of the headers used to specify a common header for all source CSV files being imported. If this field is specified then the first line of each CSV file is treated as data instead of the header. If this field is not specified the the first line of each CSV file is treated as the header.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-csv.html#cfn-dynamodb-table-csv-headerlist
   */
  readonly headerList?: string[];
}
/**
 * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html
 */
interface CfnTag {
  /**
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html#cfn-resource-tags-key
   */
  readonly key: string;
  /**
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html#cfn-resource-tags-value
   */
  readonly value: string;
}
