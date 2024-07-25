import { aws_kms as kms, CustomResource, Lazy, Resource } from 'aws-cdk-lib';
import {
  Attribute,
  BillingMode,
  CfnTable,
  CfnTableProps,
  GlobalSecondaryIndexProps,
  ITable,
  LocalSecondaryIndexProps,
  ProjectionType,
  SchemaOptions,
  SecondaryIndexProps,
  Table,
  TableEncryption,
  TableProps,
} from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

const HASH_KEY_TYPE = 'HASH';
const RANGE_KEY_TYPE = 'RANGE';

// https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html#limits-secondary-indexes
const MAX_LOCAL_SECONDARY_INDEX_COUNT = 5;

export const CUSTOM_DDB_CFN_TYPE = 'Custom::AmplifyDynamoDBTable';

export interface AmplifyDynamoDBTableProps extends TableProps {
  customResourceServiceToken: string;
  allowDestructiveGraphqlSchemaUpdates?: boolean;
  replaceTableUponGsiUpdate?: boolean;
}
export class AmplifyDynamoDBTable extends Resource {
  public readonly encryptionKey?: kms.IKey;
  public readonly tableArn: string;
  public readonly tableName: string;
  public readonly tableStreamArn: string | undefined;
  public readonly tableFromAttr: ITable;

  private readonly customResourceServiceToken: string;
  private readonly table: CustomResource;
  private readonly keySchema = new Array<CfnTable.KeySchemaProperty>();
  private readonly attributeDefinitions = new Array<CfnTable.AttributeDefinitionProperty>();
  private readonly globalSecondaryIndexes = new Array<CfnTable.GlobalSecondaryIndexProperty>();
  private readonly localSecondaryIndexes = new Array<CfnTable.LocalSecondaryIndexProperty>();

  private readonly secondaryIndexSchemas = new Map<string, SchemaOptions>();
  private readonly nonKeyAttributes = new Set<string>();

  private readonly tablePartitionKey: Attribute;
  private readonly tableSortKey?: Attribute;

  private readonly billingMode: BillingMode;

  constructor(scope: Construct, id: string, props: AmplifyDynamoDBTableProps) {
    super(scope, id, {
      physicalName: props.tableName,
    });
    this.customResourceServiceToken = props.customResourceServiceToken;
    this.tableName = this.physicalName;
    const { sseSpecification, encryptionKey } = this.parseEncryption(props);

    let streamSpecification: CfnTable.StreamSpecificationProperty | undefined;
    this.billingMode = props.billingMode ?? BillingMode.PROVISIONED;
    if (props.stream) {
      streamSpecification = { streamViewType: props.stream };
    }

    this.validateProvisioning(props);

    // The 'Default' id is used for setting the construct default child
    // Refer https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Node.html#defaultchild
    this.table = new CustomResource(this, 'Default', {
      serviceToken: this.customResourceServiceToken,
      resourceType: CUSTOM_DDB_CFN_TYPE,
      properties: {
        tableName: this.tableName,
        attributeDefinitions: this.attributeDefinitions,
        keySchema: this.keySchema,
        globalSecondaryIndexes: Lazy.any({ produce: () => this.globalSecondaryIndexes }, { omitEmptyArray: true }),
        localSecondaryIndexes: Lazy.any({ produce: () => this.localSecondaryIndexes }, { omitEmptyArray: true }),
        pointInTimeRecoverySpecification:
          props.pointInTimeRecovery != null ? { pointInTimeRecoveryEnabled: props.pointInTimeRecovery } : undefined,
        billingMode: this.billingMode === BillingMode.PAY_PER_REQUEST ? this.billingMode : undefined,
        provisionedThroughput:
          this.billingMode === BillingMode.PAY_PER_REQUEST
            ? undefined
            : {
                readCapacityUnits: props.readCapacity || 5,
                writeCapacityUnits: props.writeCapacity || 5,
              },
        sseSpecification: sseSpecification,
        streamSpecification: streamSpecification,
        tableClass: props.tableClass,
        timeToLiveSpecification: props.timeToLiveAttribute ? { attributeName: props.timeToLiveAttribute, enabled: true } : undefined,
        deletionProtectionEnabled: props.deletionProtection,
        allowDestructiveGraphqlSchemaUpdates: props.allowDestructiveGraphqlSchemaUpdates ?? false,
        replaceTableUponGsiUpdate: props.replaceTableUponGsiUpdate ?? false,
      },
      removalPolicy: props.removalPolicy,
    });
    this.encryptionKey = encryptionKey;

    this.tableArn = this.table.getAttString('TableArn');
    this.tableStreamArn = streamSpecification ? this.table.getAttString('TableStreamArn') : undefined;

    this.tableFromAttr = Table.fromTableAttributes(scope, `CustomTable${id}`, {
      tableArn: this.tableArn,
      tableStreamArn: this.tableStreamArn,
    });

    this.addKey(props.partitionKey, HASH_KEY_TYPE);
    this.tablePartitionKey = props.partitionKey;

    if (props.sortKey) {
      this.addKey(props.sortKey, RANGE_KEY_TYPE);
      this.tableSortKey = props.sortKey;
    }

    this.node.addValidation({ validate: () => this.validateTable() });
  }

  /**
   * Add a global secondary index of table.
   *
   * @param props the property of global secondary index
   */
  public addGlobalSecondaryIndex(props: GlobalSecondaryIndexProps) {
    this.validateProvisioning(props);
    this.validateIndexName(props.indexName);

    // build key schema and projection for index
    const gsiKeySchema = this.buildIndexKeySchema(props.partitionKey, props.sortKey);
    const gsiProjection = this.buildIndexProjection(props);

    this.globalSecondaryIndexes.push({
      indexName: props.indexName,
      keySchema: gsiKeySchema,
      projection: gsiProjection,
      provisionedThroughput:
        this.billingMode === BillingMode.PAY_PER_REQUEST
          ? undefined
          : {
              readCapacityUnits: props.readCapacity || 5,
              writeCapacityUnits: props.writeCapacity || 5,
            },
    });

    this.secondaryIndexSchemas.set(props.indexName, {
      partitionKey: props.partitionKey,
      sortKey: props.sortKey,
    });
  }

  /**
   * Add a local secondary index of table.
   *
   * @param props the property of local secondary index
   */
  public addLocalSecondaryIndex(props: LocalSecondaryIndexProps) {
    // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html#limits-secondary-indexes
    if (this.localSecondaryIndexes.length >= MAX_LOCAL_SECONDARY_INDEX_COUNT) {
      throw new RangeError(`a maximum number of local secondary index per table is ${MAX_LOCAL_SECONDARY_INDEX_COUNT}`);
    }

    this.validateIndexName(props.indexName);

    // build key schema and projection for index
    const lsiKeySchema = this.buildIndexKeySchema(this.tablePartitionKey, props.sortKey);
    const lsiProjection = this.buildIndexProjection(props);

    this.localSecondaryIndexes.push({
      indexName: props.indexName,
      keySchema: lsiKeySchema,
      projection: lsiProjection,
    });

    this.secondaryIndexSchemas.set(props.indexName, {
      partitionKey: this.tablePartitionKey,
      sortKey: props.sortKey,
    });
  }

  /**
   * Get schema attributes of table or index.
   *
   * @returns Schema of table or index.
   */
  public schema(indexName?: string): SchemaOptions {
    if (!indexName) {
      return {
        partitionKey: this.tablePartitionKey,
        sortKey: this.tableSortKey,
      };
    }
    let schema = this.secondaryIndexSchemas.get(indexName);
    if (!schema) {
      throw new Error(`Cannot find schema for index: ${indexName}. Use 'addGlobalSecondaryIndex' or 'addLocalSecondaryIndex' to add index`);
    }
    return schema;
  }

  private addKey(attribute: Attribute, keyType: string) {
    const existingProp = this.findKey(keyType);
    if (existingProp) {
      throw new Error(`Unable to set ${attribute.name} as a ${keyType} key, because ${existingProp.attributeName} is a ${keyType} key`);
    }
    this.registerAttribute(attribute);
    this.keySchema.push({
      attributeName: attribute.name,
      keyType,
    });
    return this;
  }

  private findKey(keyType: string) {
    return this.keySchema.find((prop) => prop.keyType === keyType);
  }

  /**
   * Register the key attribute of table or secondary index to assemble attribute definitions of TableResourceProps.
   *
   * @param attribute the key attribute of table or secondary index
   */
  private registerAttribute(attribute: Attribute) {
    const { name, type } = attribute;
    const existingDef = this.attributeDefinitions.find((def) => def.attributeName === name);
    if (existingDef && existingDef.attributeType !== type) {
      throw new Error(`Unable to specify ${name} as ${type} because it was already defined as ${existingDef.attributeType}`);
    }
    if (!existingDef) {
      this.attributeDefinitions.push({
        attributeName: name,
        attributeType: type,
      });
    }
  }

  /**
   * Validate the table construct.
   *
   * @returns an array of validation error message
   */
  private validateTable(): string[] {
    const errors = new Array<string>();

    if (!this.tablePartitionKey) {
      errors.push('a partition key must be specified');
    }
    if (this.localSecondaryIndexes.length > 0 && !this.tableSortKey) {
      errors.push('a sort key of the table must be specified to add local secondary indexes');
    }

    return errors;
  }

  /**
   * Set up key properties and return the Table encryption property from the
   * user's configuration.
   */
  private parseEncryption(props: TableProps): { sseSpecification: CfnTableProps['sseSpecification']; encryptionKey?: kms.IKey } {
    let encryptionType = props.encryption;

    if (encryptionType === undefined) {
      encryptionType =
        props.encryptionKey != null
          ? // If there is a configured encryptionKey, the encryption is implicitly CUSTOMER_MANAGED
            TableEncryption.CUSTOMER_MANAGED
          : // Otherwise, if severSideEncryption is enabled, it's AWS_MANAGED; else undefined (do not set anything)
            TableEncryption.AWS_MANAGED;
    }

    if (encryptionType !== TableEncryption.CUSTOMER_MANAGED && props.encryptionKey) {
      throw new Error(
        '`encryptionKey cannot be specified unless encryption is set to TableEncryption.CUSTOMER_MANAGED (it was set to ${encryptionType})`',
      );
    }

    if (encryptionType === TableEncryption.CUSTOMER_MANAGED && props.replicationRegions) {
      throw new Error('TableEncryption.CUSTOMER_MANAGED is not supported by DynamoDB Global Tables (where replicationRegions was set)');
    }

    switch (encryptionType) {
      case TableEncryption.CUSTOMER_MANAGED:
        const encryptionKey =
          props.encryptionKey ??
          new kms.Key(this, 'Key', {
            description: `Customer-managed key auto-created for encrypting DynamoDB table at ${this.node.path}`,
            enableKeyRotation: true,
          });

        return {
          sseSpecification: { sseEnabled: true, kmsMasterKeyId: encryptionKey.keyArn, sseType: 'KMS' },
          encryptionKey,
        };

      case TableEncryption.AWS_MANAGED:
        // Not specifying "sseType: 'KMS'" here because it would cause phony changes to existing stacks.
        return { sseSpecification: { sseEnabled: true } };

      case TableEncryption.DEFAULT:
        return { sseSpecification: { sseEnabled: false } };

      case undefined:
        // Not specifying "sseEnabled: false" here because it would cause phony changes to existing stacks.
        return { sseSpecification: undefined };

      default:
        throw new Error(`Unexpected 'encryptionType': ${encryptionType}`);
    }
  }

  /**
   * Validate read and write capacity are not specified for on-demand tables (billing mode PAY_PER_REQUEST).
   *
   * @param props read and write capacity properties
   */
  private validateProvisioning(props: { readCapacity?: number; writeCapacity?: number }): void {
    if (this.billingMode === BillingMode.PAY_PER_REQUEST) {
      if (props.readCapacity !== undefined || props.writeCapacity !== undefined) {
        throw new Error('you cannot provision read and write capacity for a table with PAY_PER_REQUEST billing mode');
      }
    }
  }

  /**
   * Validate index name to check if a duplicate name already exists.
   *
   * @param indexName a name of global or local secondary index
   */
  private validateIndexName(indexName: string) {
    if (this.secondaryIndexSchemas.has(indexName)) {
      // a duplicate index name causes validation exception, status code 400, while trying to create CFN stack
      throw new Error(`a duplicate index name, ${indexName}, is not allowed`);
    }
  }

  /**
   * Validate non-key attributes by checking limits within secondary index, which may vary in future.
   *
   * @param nonKeyAttributes a list of non-key attribute names
   */
  private validateNonKeyAttributes(nonKeyAttributes: string[]) {
    if (this.nonKeyAttributes.size + nonKeyAttributes.length > 100) {
      // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html#limits-secondary-indexes
      throw new RangeError('a maximum number of nonKeyAttributes across all of secondary indexes is 100');
    }
    // store all non-key attributes
    nonKeyAttributes.forEach((att) => this.nonKeyAttributes.add(att));
  }

  private buildIndexKeySchema(partitionKey: Attribute, sortKey?: Attribute): CfnTable.KeySchemaProperty[] {
    this.registerAttribute(partitionKey);
    const indexKeySchema: CfnTable.KeySchemaProperty[] = [{ attributeName: partitionKey.name, keyType: HASH_KEY_TYPE }];

    if (sortKey) {
      this.registerAttribute(sortKey);
      indexKeySchema.push({ attributeName: sortKey.name, keyType: RANGE_KEY_TYPE });
    }

    return indexKeySchema;
  }

  private buildIndexProjection(props: SecondaryIndexProps): CfnTable.ProjectionProperty {
    if (props.projectionType === ProjectionType.INCLUDE && !props.nonKeyAttributes) {
      // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-projectionobject.html
      throw new Error(`non-key attributes should be specified when using ${ProjectionType.INCLUDE} projection type`);
    }

    if (props.projectionType !== ProjectionType.INCLUDE && props.nonKeyAttributes) {
      // this combination causes validation exception, status code 400, while trying to create CFN stack
      throw new Error(`non-key attributes should not be specified when not using ${ProjectionType.INCLUDE} projection type`);
    }

    if (props.nonKeyAttributes) {
      this.validateNonKeyAttributes(props.nonKeyAttributes);
    }

    return {
      projectionType: props.projectionType ?? ProjectionType.ALL,
      nonKeyAttributes: props.nonKeyAttributes ?? undefined,
    };
  }
}
