import {
  DynamoDB,
  AttributeDefinition,
  ContinuousBackupsDescription,
  CreateGlobalSecondaryIndexAction,
  CreateTableCommandInput,
  GlobalSecondaryIndexDescription,
  KeySchemaElement,
  Projection,
  TableDescription,
  TimeToLiveDescription,
  UpdateContinuousBackupsCommandInput,
  UpdateTableCommandInput,
  UpdateTimeToLiveCommandInput,
  ResourceNotFoundException,
  DescribeTimeToLiveCommandOutput,
} from '@aws-sdk/client-dynamodb';

const ddbClient = new DynamoDB();

const finished: AWSCDKAsyncCustomResource.IsCompleteResponse = {
  IsComplete: true,
};
const notFinished: AWSCDKAsyncCustomResource.IsCompleteResponse = {
  IsComplete: false,
};

/**
 * Util function to log especially for nested objects and arrays
 * @param msg
 * @param other arrays of arguments to be logged
 */
const log = (msg: string, ...other: any[]) => {
  console.log(
    msg,
    other.map((o) => (typeof o === 'object' ? JSON.stringify(o, undefined, 2) : o)),
  );
};

/**
 * OnEvent handler to process the CFN event, including `Create`, `Update` and `Delete`
 * @param event CFN event
 * @returns Response object which is sent back to CFN
 */
export const onEvent = async (event: AWSCDKAsyncCustomResource.OnEventRequest): Promise<AWSCDKAsyncCustomResource.OnEventResponse> => {
  console.log({ ...event, ResponseURL: '[redacted]' });
  const tableDef = extractTableInputFromEvent(event);
  console.log('Input table state: ', tableDef);

  let result;
  switch (event.RequestType) {
    case 'Create':
      console.log('Initiating CREATE event');
      const createTableInput = toCreateTableInput(tableDef);
      console.log('Create Table Params: ', createTableInput);
      const response = await createNewTable(createTableInput);
      result = {
        PhysicalResourceId: response.tableName,
        Data: {
          TableArn: response.tableArn,
          TableStreamArn: response.streamArn,
          TableName: response.tableName,
        },
      };
      console.log('Returning result: ', result);
      return result;
    case 'Update':
      if (!event.PhysicalResourceId) {
        throw new Error(`Could not find the physical ID for the updated resource`);
      }
      const oldTableDef = extractOldTableInputFromEvent(event);
      console.log('Fetching current table state');
      const describeTableResult = await ddbClient.describeTable({ TableName: event.PhysicalResourceId });
      if (!describeTableResult.Table) {
        throw new Error(`Could not find ${event.PhysicalResourceId} to update`);
      }
      log('Current table state: ', describeTableResult);

      // determine if table needs replacement when table key schema is changed
      if (isKeySchemaModified(describeTableResult.Table.KeySchema!, tableDef.keySchema)) {
        console.log('Detected table key schema change. Update requires replacement');
        if (tableDef.allowDestructiveGraphqlSchemaUpdates) {
          return replaceTable(describeTableResult.Table, tableDef);
        } else {
          throw new Error(
            "Editing key schema of table requires replacement which will cause ALL EXISITING DATA TO BE LOST. If this is intended, set the 'allowDestructiveGraphqlSchemaUpdates' to true and deploy again.",
          );
        }
      }
      // when both sandbox and destructive updates are enabled, gsi update will trigger a table replacement
      if (tableDef.replaceTableUponGsiUpdate && tableDef.allowDestructiveGraphqlSchemaUpdates) {
        const nextUpdate = getNextGSIUpdate(describeTableResult.Table, tableDef);
        if (nextUpdate !== undefined) {
          console.log(
            'Detected global secondary index changes in sandbox mode with destructive updates allowed. Update requires replacement',
          );
          return replaceTable(describeTableResult.Table, tableDef);
        }
      }

      // determine if point in time recovery is changed -> describeContinuousBackups & updateContinuousBackups
      const describePointInTimeRecoveryResult = await ddbClient.describeContinuousBackups({ TableName: event.PhysicalResourceId });
      console.log('Current point in time recovery: ', describePointInTimeRecoveryResult);
      const pointInTimeUpdate = getPointInTimeRecoveryUpdate(describePointInTimeRecoveryResult.ContinuousBackupsDescription, tableDef);
      if (pointInTimeUpdate) {
        log('Computed point in time recovery update', pointInTimeUpdate);
        await ddbClient.updateContinuousBackups(pointInTimeUpdate);
        await retry(
          async () => await isTableReady(event.PhysicalResourceId!),
          (res) => res === true,
        );
        console.log(`Table '${event.PhysicalResourceId}' is ready after the update of PointInTimeRecovery.`);
      }

      // determine if deletion protection is changed
      // DeletionProtection modification must be the only operation in the request
      const deletionProtectionUpdate = getDeletionProtectionUpdate(describeTableResult.Table, tableDef);
      if (deletionProtectionUpdate) {
        log('Computed deletion protection update', deletionProtectionUpdate);
        await ddbClient.updateTable(deletionProtectionUpdate);
        await retry(
          async () => await isTableReady(event.PhysicalResourceId!),
          (res) => res === true,
        );
        console.log(`Table '${event.PhysicalResourceId}' is ready after the update of deletion protection.`);
      }

      // determine if server side encryption is changed
      // Server-Side Encryption modification must be the only operation in the update request
      const sseUpdate = getSseUpdate(describeTableResult.Table, tableDef);
      if (sseUpdate) {
        log('Computed server side encryption update', sseUpdate);
        await ddbClient.updateTable(sseUpdate);
        await retry(
          async () => await isTableReady(event.PhysicalResourceId!),
          (res) => res === true,
        );
        console.log(`Table '${event.PhysicalResourceId}' is ready after the update of sever side encryption.`);
      }

      // determine if stream specification is changed
      // Stream change cannot be merged with GSI update
      const streamUpdate = await getStreamUpdate(describeTableResult.Table, tableDef);
      if (streamUpdate) {
        log('Computed stream specification update', streamUpdate);
        await ddbClient.updateTable(streamUpdate);
        await retry(
          async () => await isTableReady(event.PhysicalResourceId!),
          (res) => res === true,
        );
        console.log(`Table '${event.PhysicalResourceId}' is ready after the update of stream specificaion.`);
      }

      // determine if ttl is changed -> describeTimeToLive & updateTimeToLive
      if (isTtlModified(oldTableDef.timeToLiveSpecification, tableDef.timeToLiveSpecification)) {
        const describeTimeToLiveResult = await getTtlStatus(event.PhysicalResourceId);
        console.log('Current TTL: ', describeTimeToLiveResult);
        const ttlUpdate = getTtlUpdate(describeTimeToLiveResult.TimeToLiveDescription, tableDef);
        if (ttlUpdate) {
          log('Computed time to live update', ttlUpdate);
          console.log('Initiating TTL update');
          await ddbClient.updateTimeToLive(ttlUpdate);
          // TTL update could take more than 15 mins which exceeds lambda timeout
          // Return the result instead of waiting here
          result = {
            PhysicalResourceId: event.PhysicalResourceId,
            Data: {
              TableArn: describeTableResult.Table.TableArn,
              TableStreamArn: describeTableResult.Table.LatestStreamArn,
              TableName: describeTableResult.Table.TableName,
            },
          };
          return result;
        }
      }

      // determine GSI updates
      const nextGsiUpdate = getNextAtomicUpdate(describeTableResult.Table, tableDef);
      if (nextGsiUpdate) {
        log('Computed next update', nextGsiUpdate);
        console.log('Initiating table GSI update');
        await ddbClient.updateTable(nextGsiUpdate);
      }
      result = {
        PhysicalResourceId: event.PhysicalResourceId,
        Data: {
          TableArn: describeTableResult.Table.TableArn,
          TableStreamArn: describeTableResult.Table.LatestStreamArn,
          TableName: describeTableResult.Table.TableName,
        },
      };
      return result;
    case 'Delete':
      if (!event.PhysicalResourceId) {
        throw new Error(`Could not find the physical ID for the resource`);
      }
      result = {
        PhysicalResourceId: event.PhysicalResourceId,
      };
      try {
        console.log('Fetching current table state');
        const describeTableResultBeforeDeletion = await ddbClient.describeTable({ TableName: event.PhysicalResourceId });
        if (describeTableResultBeforeDeletion.Table?.DeletionProtectionEnabled) {
          // Skip the deletion when protection is enabled
          return result;
        }
        console.log('Initiating table deletion');
        await ddbClient.deleteTable({ TableName: event.PhysicalResourceId });
        return result;
      } catch (err) {
        if (err instanceof ResourceNotFoundException) {
          console.log('Table to be deleted is not found. Deletion complete.');
          return result;
        }
        throw err;
      }
    default:
      throw new Error(`Event type ${event.RequestType} is not supported`);
  }
  // after this function exits, the state machine will invoke isComplete in a loop until it returns finished or the state machine times out
};

/**
 * IsComplete handler invoked based on a query interval to check the progress of the event
 * This function also kick offs the additional steps of updates if they are any
 * @param event CFN event
 * @returns Response object with `isComplete` bool attribute to indicate the completeness of process
 */
export const isComplete = async (
  event: AWSCDKAsyncCustomResource.IsCompleteRequest,
): Promise<AWSCDKAsyncCustomResource.IsCompleteResponse> => {
  log('got event', { ...event, ResponseURL: '[redacted]' });
  if (event.RequestType === 'Delete') {
    // nothing else to do on delete
    console.log('Delete is finished');
    return finished;
  }
  if (!event.PhysicalResourceId) {
    throw new Error('PhysicalResourceId not set in call to isComplete');
  }
  console.log('Fetching current table state');
  const describeTableResult = await retry(
    async () => await ddbClient.describeTable({ TableName: event.PhysicalResourceId! }),
    (result) => !!result?.Table,
  );
  if (describeTableResult.Table?.TableStatus !== 'ACTIVE') {
    console.log('Table not active yet');
    return notFinished;
  }
  // table is active, need to check GSI status
  if (describeTableResult.Table.GlobalSecondaryIndexes?.some((gsi) => gsi.IndexStatus !== 'ACTIVE' || gsi.Backfilling)) {
    console.log('Some GSI is not active yet');
    return notFinished;
  }

  const endState = extractTableInputFromEvent(event);

  if (event.RequestType === 'Create' || event.Data?.IsTableReplaced === true) {
    // Need additional call if pointInTimeRecovery is enabled
    const describePointInTimeRecoveryResult = await ddbClient.describeContinuousBackups({ TableName: event.PhysicalResourceId });
    const pointInTimeUpdate = getPointInTimeRecoveryUpdate(describePointInTimeRecoveryResult.ContinuousBackupsDescription, endState);
    if (pointInTimeUpdate) {
      console.log('Updating table with point in time recovery enabled');
      await ddbClient.updateContinuousBackups(pointInTimeUpdate);
      return notFinished;
    }
    // Need additional call if ttl is defined
    // Since this is a create/re-create event, the original table always has TTL disabled. Only update TTL if it is enabled in endstate.
    if (endState.timeToLiveSpecification && endState.timeToLiveSpecification.enabled) {
      const describeTimeToLiveResult = await getTtlStatus(event.PhysicalResourceId);
      const ttlUpdate = getTtlUpdate(describeTimeToLiveResult.TimeToLiveDescription, endState);
      if (ttlUpdate) {
        console.log('Updating table with TTL enabled');
        await ddbClient.updateTimeToLive(ttlUpdate);
        return notFinished;
      }
    }
    // no additional updates required on create
    console.log('Create is finished');
    return finished;
  }

  // need to check if any more GSI updates are necessary
  const nextUpdate = getNextAtomicUpdate(describeTableResult.Table, endState);
  log('Computed next update', nextUpdate);
  if (!nextUpdate) {
    // current state equals end state so we're done
    console.log('No additional updates needed. Update finished');
    return finished;
  }
  // don't need to merge gsi updates with other table updates here because those have already been applied in the first update
  console.log('Initiating table update');
  await ddbClient.updateTable(nextUpdate);
  return notFinished;
  // a response of notFinished in this function will cause the function to be invoked again by the state machine after some time
};

/**
 * Util function to replace a table with the table name unchanged
 * @param currentState table description result from DynamoDB SDK call
 * @param endState The input table state from user
 * @returns Response object which is sent back to CFN
 */
const replaceTable = async (
  currentState: TableDescription,
  endState: CustomDDB.Input,
): Promise<AWSCDKAsyncCustomResource.OnEventResponse> => {
  if (currentState.DeletionProtectionEnabled === true) {
    throw new Error('Table cannot be replaced when the deletion protection is enabled.');
  }
  console.log('Deleting the old table');
  await ddbClient.deleteTable({ TableName: currentState.TableName });
  await retry(
    async () => await doesTableExist(currentState.TableName!),
    (res) => res === false,
  );
  console.log(`Table '${currentState.TableName}' does not exist. Deletion is finished.`);

  const createTableInput = toCreateTableInput(endState);
  console.log('Creating the new table');
  const response = await createNewTable(createTableInput);
  const result = {
    PhysicalResourceId: response.tableName,
    Data: {
      TableArn: response.tableArn,
      TableStreamArn: response.streamArn,
      TableName: response.tableName,
      IsTableReplaced: true, // This value will be consumed by isComplete handler
    },
  };
  log('Returning result', result);
  return result;
};

/**
 * You can only perform one of the following operations at once:
    - Modify the provisioned throughput settings of the table.
    - Remove a global secondary index from the table.
    - Create a new global secondary index on the table. After the index begins backfilling, you can use UpdateTable to perform other operations.
    @link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#updateTable-property
 * @param currentState table description result from DynamoDB SDK call
 * @param endState The input table state from user
 * @returns UpdateTableInput object including the next GSI update only. Undefined if no next steps
 */
export const getNextAtomicUpdate = (currentState: TableDescription, endState: CustomDDB.Input): UpdateTableCommandInput | undefined => {
  const currentStateGSIs = currentState.GlobalSecondaryIndexes || [];
  const isTableBillingModeModified =
    (currentState.BillingModeSummary?.BillingMode !== undefined && currentState.BillingModeSummary?.BillingMode !== endState.billingMode) ||
    (currentState.BillingModeSummary?.BillingMode == undefined && endState.billingMode === 'PAY_PER_REQUEST');
  const isTableProvisionThroughputModified =
    (endState.provisionedThroughput?.readCapacityUnits !== undefined &&
      currentState.ProvisionedThroughput?.ReadCapacityUnits !== endState.provisionedThroughput?.readCapacityUnits) ||
    (endState.provisionedThroughput?.writeCapacityUnits !== undefined &&
      currentState.ProvisionedThroughput?.WriteCapacityUnits !== endState.provisionedThroughput?.writeCapacityUnits);
  if (isTableBillingModeModified || isTableProvisionThroughputModified) {
    let updateInput: any = {
      TableName: currentState.TableName!,
      BillingMode: isTableBillingModeModified ? endState.billingMode : undefined,
      ProvisionedThroughput:
        isTableProvisionThroughputModified && endState.billingMode === 'PROVISIONED'
          ? {
              ReadCapacityUnits: endState.provisionedThroughput?.readCapacityUnits,
              WriteCapacityUnits: endState.provisionedThroughput?.writeCapacityUnits,
            }
          : undefined,
    };
    // When the table's billing is changed to 'PROVISIONED', the current indexes of the table
    // should be updated with the provisionedThroughput at the same time. Otherwise it will fail the parameter validation.
    // The table's throughput will be applied by default.
    if (isTableBillingModeModified && endState.billingMode === 'PROVISIONED') {
      const indexToBeUpdated = currentStateGSIs.map((gsiToUpdate) => {
        return {
          Update: {
            IndexName: gsiToUpdate.IndexName,
            ProvisionedThroughput: {
              ReadCapacityUnits: endState.provisionedThroughput?.readCapacityUnits,
              WriteCapacityUnits: endState.provisionedThroughput?.writeCapacityUnits,
            },
          },
        };
      });
      updateInput = {
        ...updateInput,
        GlobalSecondaryIndexUpdates: indexToBeUpdated.length > 0 ? indexToBeUpdated : undefined,
      };
    }
    return parsePropertiesToDynamoDBInput(updateInput) as UpdateTableCommandInput;
  }
  return getNextGSIUpdate(currentState, endState);
};

/**
 * Compares the currentState with the endState to determine a next GSI related update step that will get the table closer to the end state
 * @param currentState table description result from DynamoDB SDK call
 * @param endState The input table state from user
 * @returns UpdateTableInput object including the next GSI update only. Undefined if no next steps
 */
const getNextGSIUpdate = (currentState: TableDescription, endState: CustomDDB.Input): UpdateTableCommandInput | undefined => {
  const endStateGSIs = endState.globalSecondaryIndexes || [];
  const endStateGSINames = endStateGSIs.map((gsi) => gsi.indexName);

  const currentStateGSIs = currentState.GlobalSecondaryIndexes || [];
  const currentStateGSINames = currentStateGSIs.map((gsi) => gsi.IndexName);

  // function to identify any GSIs that need to be removed
  const gsiRequiresReplacementPredicate = (currentGSI: GlobalSecondaryIndexDescription): boolean => {
    // check if the index has been removed entirely
    if (!endStateGSINames.includes(currentGSI.IndexName!)) return true;
    // get the end state of this GSI
    const respectiveEndStateGSI = endStateGSIs.find((endStateGSI) => endStateGSI.indexName === currentGSI.IndexName)!;
    // detect if projection has changed
    if (isProjectionModified(currentGSI.Projection!, respectiveEndStateGSI.projection!)) return true;
    // detect if key schema has changed
    if (isKeySchemaModified(currentGSI.KeySchema!, respectiveEndStateGSI.keySchema!)) return true;
    // if we got here, then the GSI does not need to be removed
    return false;
  };
  const gsiToRemove = currentStateGSIs.find(gsiRequiresReplacementPredicate);
  if (gsiToRemove) {
    return {
      TableName: currentState.TableName!,
      GlobalSecondaryIndexUpdates: [
        {
          Delete: {
            IndexName: gsiToRemove.IndexName!,
          },
        },
      ],
    };
  }

  // if we get here, then find a GSI that needs to be created and construct an update request
  const gsiRequiresCreationPredicate = (endStateGSI: CustomDDB.GlobalSecondaryIndexProperty): boolean =>
    !currentStateGSINames.includes(endStateGSI.indexName);

  const gsiToAdd = endStateGSIs.find(gsiRequiresCreationPredicate);
  if (gsiToAdd) {
    let gsiProvisionThroughput: any = gsiToAdd.provisionedThroughput;
    // When table is billing at `PROVISIONED` and no throughput defined for gsi, the table's throughput will be used by default
    if (endState.billingMode === 'PROVISIONED' && gsiToAdd.provisionedThroughput === undefined) {
      gsiProvisionThroughput = {
        readCapacityUnits: endState.provisionedThroughput?.readCapacityUnits,
        writeCapacityUnits: endState.provisionedThroughput?.writeCapacityUnits,
      };
    }
    const attributeNamesToInclude = gsiToAdd.keySchema.map((schema) => schema.attributeName);
    const gsiToAddAction = {
      IndexName: gsiToAdd.indexName,
      KeySchema: gsiToAdd.keySchema,
      Projection: gsiToAdd.projection,
      ProvisionedThroughput: gsiProvisionThroughput,
    };
    return {
      TableName: currentState.TableName!,
      AttributeDefinitions: endState.attributeDefinitions
        ?.filter((def) => attributeNamesToInclude.includes(def.attributeName))
        .map((def) => usePascalCaseForObjectKeys(def)) as Array<AttributeDefinition>,
      GlobalSecondaryIndexUpdates: [
        {
          Create: parsePropertiesToDynamoDBInput(gsiToAddAction) as CreateGlobalSecondaryIndexAction,
        },
      ],
    };
  }

  // The major update is the index provisioned throughput
  const gsiRequiresUpdatePredicate = (endStateGSI: CustomDDB.GlobalSecondaryIndexProperty): boolean => {
    if (
      endState.provisionedThroughput &&
      endState.provisionedThroughput.readCapacityUnits &&
      endState.provisionedThroughput.writeCapacityUnits &&
      currentStateGSINames.includes(endStateGSI.indexName)
    ) {
      const currentStateGSI = currentStateGSIs.find((gsi) => gsi.IndexName === endStateGSI.indexName);
      if (currentStateGSI) {
        if (
          currentStateGSI.ProvisionedThroughput?.ReadCapacityUnits !== endStateGSI.provisionedThroughput?.readCapacityUnits ||
          currentStateGSI.ProvisionedThroughput?.WriteCapacityUnits !== endStateGSI.provisionedThroughput?.writeCapacityUnits
        ) {
          return true;
        }
      }
    }
    return false;
  };
  const gsiToUpdate = endStateGSIs.find(gsiRequiresUpdatePredicate);
  if (gsiToUpdate) {
    return {
      TableName: currentState.TableName!,
      GlobalSecondaryIndexUpdates: [
        {
          Update: {
            IndexName: gsiToUpdate.indexName,
            ProvisionedThroughput: {
              ReadCapacityUnits: gsiToUpdate.provisionedThroughput?.readCapacityUnits!,
              WriteCapacityUnits: gsiToUpdate.provisionedThroughput?.writeCapacityUnits!,
            },
          },
        },
      ],
    };
  }

  // no more updates necessary
  return undefined;
};

/**
 * Compares the currentState with the endState to determine if the stream specification is updated
 * When the streamViewType is changed, the stream will be disabled first before changing the type
 * @param currentState table description result from DynamoDB SDK call
 * @param endState The input table state from user
 * @returns UpdateTableInput object including the stream update only. Undefined if no changes
 */
export const getStreamUpdate = async (
  currentState: TableDescription,
  endState: CustomDDB.Input,
): Promise<UpdateTableCommandInput | undefined> => {
  let streamUpdate;
  if (
    endState.streamSpecification?.streamViewType !== undefined &&
    (currentState.StreamSpecification === undefined || currentState.StreamSpecification.StreamEnabled === false)
  ) {
    streamUpdate = { StreamEnabled: true, StreamViewType: endState.streamSpecification.streamViewType };
  } else if (endState.streamSpecification?.streamViewType === undefined && currentState.StreamSpecification?.StreamEnabled === true) {
    streamUpdate = { StreamEnabled: false };
  } else if (
    currentState.StreamSpecification?.StreamEnabled === true &&
    endState.streamSpecification?.streamViewType !== undefined &&
    currentState.StreamSpecification.StreamViewType !== endState.streamSpecification?.streamViewType
  ) {
    // Stream view type is changed. Need to disable stream before changing the type
    console.log('Detect stream view type is changed. Disabling stream before the type change.');
    await ddbClient.updateTable({
      TableName: currentState.TableName!,
      StreamSpecification: { StreamEnabled: false },
    });
    await retry(
      async () => await isTableReady(currentState.TableName!),
      (res) => res === true,
    );
    streamUpdate = { StreamEnabled: true, StreamViewType: endState.streamSpecification.streamViewType };
  }
  if (streamUpdate) {
    return {
      TableName: currentState.TableName!,
      StreamSpecification: streamUpdate,
    } as UpdateTableCommandInput;
  }
  return undefined;
};

/**
 * Compares the currentState with the endState to determine if the server side encryption (SSE) is updated
 * @param currentState table description result from DynamoDB SDK call
 * @param endState The input table state from user
 * @returns UpdateTableInput object including the SSE update only. Undefined if no changes
 */
export const getSseUpdate = (currentState: TableDescription, endState: CustomDDB.Input): UpdateTableCommandInput | undefined => {
  let sseUpdate;
  // When current table has SSE
  if (currentState.SSEDescription) {
    if (!endState.sseSpecification?.sseEnabled) {
      sseUpdate = {
        Enabled: false,
      };
    } else if (
      endState.sseSpecification?.sseEnabled === true &&
      endState.sseSpecification.sseType !== undefined &&
      endState.sseSpecification.sseType !== currentState.SSEDescription.SSEType
    ) {
      sseUpdate = {
        Enabled: true,
        SSEType: endState.sseSpecification.sseType,
        KMSMasterKeyId: endState.sseSpecification.kmsMasterKeyId,
      };
    }
  }
  // When current table does not have SSE
  else {
    if (endState.sseSpecification?.sseEnabled) {
      sseUpdate = {
        Enabled: true,
        SSEType: endState.sseSpecification.sseType,
        KMSMasterKeyId: endState.sseSpecification.kmsMasterKeyId,
      };
    }
  }
  if (sseUpdate) {
    return parsePropertiesToDynamoDBInput({
      TableName: currentState.TableName!,
      SSESpecification: sseUpdate,
    }) as UpdateTableCommandInput;
  }
  return undefined;
};

/**
 * Compares the currentState with the endState to determine if the deletion protection is updated
 * @param currentState table description result from DynamoDB SDK call
 * @param endState The input table state from user
 * @returns UpdateTableInput object including the deletion protection update only. Undefined if no changes
 */
export const getDeletionProtectionUpdate = (
  currentState: TableDescription,
  endState: CustomDDB.Input,
): UpdateTableCommandInput | undefined => {
  if (endState.deletionProtectionEnabled !== undefined && currentState.DeletionProtectionEnabled !== endState.deletionProtectionEnabled) {
    return {
      TableName: currentState.TableName!,
      DeletionProtectionEnabled: endState.deletionProtectionEnabled,
    } as UpdateTableCommandInput;
  }
  // When the deletion protection is undefined in input table, it will be considered as false
  else if (endState.deletionProtectionEnabled === undefined && currentState.DeletionProtectionEnabled === true) {
    return {
      TableName: currentState.TableName!,
      DeletionProtectionEnabled: false,
    } as UpdateTableCommandInput;
  }
  return undefined;
};

/**
 * Compares the current time to live (TTL) config with the endState to determine if the TTL is updated
 * @param currentTTL Time to live description result from DynamoDB SDK call
 * @param endState The input table state from user
 * @returns UpdateTimeToLiveInput object. Undefined if no changes
 */
export const getTtlUpdate = (
  currentTTL: TimeToLiveDescription | undefined,
  endState: CustomDDB.Input,
): UpdateTimeToLiveCommandInput | undefined => {
  const endTTL = endState.timeToLiveSpecification;
  if (currentTTL && currentTTL.TimeToLiveStatus) {
    // When TTL is enabled for current table
    if (currentTTL.TimeToLiveStatus === 'ENABLED' && currentTTL.AttributeName) {
      if (!endTTL || !endTTL.enabled) {
        // Disable the ttl
        return {
          TableName: endState.tableName!,
          TimeToLiveSpecification: {
            Enabled: false,
            // When disabling TTL, the attribute name should stay the same with current. Otherwise it will fail parameter validation
            AttributeName: currentTTL.AttributeName,
          },
        };
      } else if (currentTTL.AttributeName !== endTTL.attributeName) {
        // TTL field renaming
        return {
          TableName: endState.tableName!,
          TimeToLiveSpecification: {
            Enabled: true,
            AttributeName: endTTL.attributeName,
          },
        };
      }
    } else if (currentTTL.TimeToLiveStatus === 'DISABLED' && endTTL && endTTL.enabled) {
      // Enable the ttl
      return {
        TableName: endState.tableName!,
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: endTTL.attributeName,
        },
      };
    }
  }
  return undefined;
};

/**
 * Compares the current point in time recovery config with the endState to determine if it is updated
 * @param currentPointInTime Point in time recovery description result from DynamoDB SDK call
 * @param endState The input table state from user
 * @returns UpdateContinousBackupsInput object. Undefined if no changes
 */
export const getPointInTimeRecoveryUpdate = (
  currentPointInTime: ContinuousBackupsDescription | undefined,
  endState: CustomDDB.Input,
): UpdateContinuousBackupsCommandInput | undefined => {
  if (!currentPointInTime) {
    return undefined;
  }
  const currentStatus = currentPointInTime.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus;
  const endStatus = endState.pointInTimeRecoverySpecification?.pointInTimeRecoveryEnabled;
  if (endStatus === undefined || endStatus === false) {
    if (currentStatus === 'ENABLED') {
      return {
        TableName: endState.tableName!,
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: false,
        },
      };
    }
  } else {
    if (currentStatus === 'DISABLED') {
      return {
        TableName: endState.tableName!,
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      };
    }
  }
  return undefined;
};

/**
 * Data to be extracted from create table SDK call response
 */
type CreateTableResponse = {
  tableName: string;
  tableArn: string;
  streamArn?: string;
};

/**
 * Extract the custom DynamoDB table properties from event, during which the service token will be removed
 * and the string values will be correctly parsed to boolean or number
 * @param event Event for onEvent or isComplete
 * @returns The table input for Custom dynamoDB Table
 */
export const extractTableInputFromEvent = (
  event: AWSCDKAsyncCustomResource.OnEventRequest | AWSCDKAsyncCustomResource.IsCompleteRequest,
): CustomDDB.Input => {
  // isolate the resource properties from the event and remove the service token
  const resourceProperties = { ...event.ResourceProperties } as Record<string, any> & { ServiceToken?: string };
  delete resourceProperties.ServiceToken;

  // cast the remaining resource properties to the DynamoDB API call input type
  const tableDef = convertStringToBooleanOrNumber(resourceProperties) as CustomDDB.Input;
  return tableDef;
};

/**
 * Extract the old custom DynamoDB table properties from event, during which the service token will be removed
 * and the string values will be correctly parsed to boolean or number
 * @param event Event for onEvent or isComplete
 * @returns The old table input for Custom dynamoDB Table
 */
export const extractOldTableInputFromEvent = (
  event: AWSCDKAsyncCustomResource.OnEventRequest | AWSCDKAsyncCustomResource.IsCompleteRequest,
): CustomDDB.Input => {
  // isolate the resource properties from the event and remove the service token
  const resourceProperties = { ...event.OldResourceProperties } as Record<string, any> & { ServiceToken?: string };
  delete resourceProperties.ServiceToken;

  // cast the remaining resource properties to the DynamoDB API call input type
  const tableDef = convertStringToBooleanOrNumber(resourceProperties) as CustomDDB.Input;
  return tableDef;
};

/**
 * Parse the properties to the form supported by DynamoDB SDK call, in which the undefined properties will be removed first
 * and then the object keys will be converted to PascalCase
 * @param obj input object
 * @returns object in the form recognized by DynamoDB SDK call
 */
const parsePropertiesToDynamoDBInput = (obj: { [key: string]: any }): { [key: string]: any } => {
  return usePascalCaseForObjectKeys(removeUndefinedAttributes(obj));
};

/**
 * Util function to convert keys in object to PascalCase
 * @param obj input object
 * @returns object with keys in PascalCase
 */
const usePascalCaseForObjectKeys = (obj: { [key: string]: any }): { [key: string]: any } => {
  const result: { [key: string]: any } = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key) && key !== '') {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      const value = obj[key];

      if (Array.isArray(value)) {
        result[capitalizedKey] = value.map((v) => usePascalCaseForObjectKeys(v));
      } else if (typeof value === 'object' && value !== null) {
        // If the value is an object, recursively capitalize its keys
        result[capitalizedKey] = usePascalCaseForObjectKeys(value);
      } else {
        result[capitalizedKey] = value;
      }
    }
  }

  return result;
};

/**
 * Util function to convert string values to the correct form
 * Such as 'true' to true, '5' to 5
 * @param obj Input object
 * @returns Object with its values converted to the correct form of boolean or number
 */
const convertStringToBooleanOrNumber = (obj: Record<string, any>): Record<string, any> => {
  const fieldsToBeConvertedToBoolean = [
    'deletionProtectionEnabled',
    'enabled',
    'sseEnabled',
    'pointInTimeRecoveryEnabled',
    'allowDestructiveGraphqlSchemaUpdates',
    'replaceTableUponGsiUpdate',
  ];
  const fieldsToBeConvertedToNumber = ['readCapacityUnits', 'writeCapacityUnits'];
  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      obj[key] = obj[key].map((o: Record<string, any>) => convertStringToBooleanOrNumber(o));
    } else if (typeof obj[key] === 'object') {
      // If the property is an object, recursively call the function
      obj[key] = convertStringToBooleanOrNumber(obj[key]);
    } else if (typeof obj[key] === 'string') {
      if ((obj[key] === 'true' || obj[key] === 'false') && fieldsToBeConvertedToBoolean.includes(key)) {
        // If the property is a string with value 'true' or 'false', convert it to a boolean
        obj[key] = obj[key] === 'true';
      } else if (!isNaN(Number(obj[key])) && fieldsToBeConvertedToNumber.includes(key)) {
        // If the property is a string that can be parsed into a number, convert it to a number
        obj[key] = Number(obj[key]);
      }
    }
  }
  return obj;
};
/**
 * Util function to remove undefined values from root level of object
 * @param obj Input Object
 * @returns obj without undefined attributes
 */
const removeUndefinedAttributes = (obj: Record<string, any>): Record<string, any> => {
  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      obj[key].map((o: Record<string, any>) => removeUndefinedAttributes(o));
    } else if (typeof obj[key] === 'object') {
      removeUndefinedAttributes(obj[key]);
    } else if (obj[key] === undefined) {
      // Use the delete operator to remove the attribute if it's undefined
      delete obj[key];
    }
  }
  return obj;
};

/**
 * Util function to convert user's input state of table to create table input recognized by DynamoDB SDK
 * @param props The table input from user. TODO: use types for the input
 * @returns CreateTableInput object
 */
export const toCreateTableInput = (props: CustomDDB.Input): CreateTableCommandInput => {
  const createTableInput = {
    TableName: props.tableName,
    AttributeDefinitions: props.attributeDefinitions,
    KeySchema: props.keySchema,
    GlobalSecondaryIndexes: props.globalSecondaryIndexes,
    BillingMode: props.billingMode,
    StreamSpecification: props.streamSpecification
      ? {
          StreamEnabled: true,
          StreamViewType: props.streamSpecification.streamViewType,
        }
      : undefined,
    ProvisionedThroughput: props.provisionedThroughput,
    SSESpecification: props.sseSpecification ? { Enabled: props.sseSpecification.sseEnabled } : undefined,
    DeletionProtectionEnabled: props.deletionProtectionEnabled,
  };
  return parsePropertiesToDynamoDBInput(createTableInput) as CreateTableCommandInput;
};

/**
 * Util function to make CreateTable DynamoDB call
 * @param input CreateTableInput object
 * @returns Response including table name, table ARN and stream ARN
 */
const createNewTable = async (input: CreateTableCommandInput): Promise<CreateTableResponse> => {
  const tableName = input.TableName;
  const createTableInput: CreateTableCommandInput = input;
  const result = await ddbClient.createTable(createTableInput);
  return { tableName: tableName!, tableArn: result.TableDescription!.TableArn!, streamArn: result.TableDescription?.LatestStreamArn };
};

/**
 * Util function to check if the provided table exists
 * @param tableName table name
 * @returns boolean to indicate existence of table
 */
const doesTableExist = async (tableName: string): Promise<boolean> => {
  try {
    await ddbClient.describeTable({ TableName: tableName });
    return true; // Table exists
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return false; // Table does not exist
    }
    throw error; // Handle other errors
  }
};

/**
 * Util function to check if the provided table is ready
 * @param tableName table name
 * @returns boolean to indicate readiness
 */
const isTableReady = async (tableName: string): Promise<boolean> => {
  const result = await ddbClient.describeTable({ TableName: tableName });
  if (result.Table?.TableStatus !== 'ACTIVE') {
    console.log('Table not active yet');
    return false;
  }
  // table is active, need to check GSI status
  if (result.Table.GlobalSecondaryIndexes?.some((gsi) => gsi.IndexStatus !== 'ACTIVE' || gsi.Backfilling)) {
    console.log('Some GSI is not active yet');
    return false;
  }
  return true;
};

/**
 * Util function to check the GSI changes regarding to projection type and non-key attribute
 * @param currentProjection current state of GSI projection
 * @param endProjection end state of GSI projection
 * @returns boolean to indicate the change of projection
 */
const isProjectionModified = (currentProjection: Projection, endProjection: CustomDDB.ProjectionProperty): boolean => {
  // first see if the projection type is changed
  if (currentProjection.ProjectionType !== endProjection.projectionType) return true;

  // if projection type is all for both then no need to check projection attributes
  if (currentProjection.ProjectionType === 'ALL') return false;

  const currentNonKeyAttributes = currentProjection.NonKeyAttributes || [];
  const endNonKeyAttributes = endProjection.nonKeyAttributes || [];
  // if an attribute has been added or removed
  if (currentNonKeyAttributes.length !== endNonKeyAttributes.length) return true;

  // if an attribute has been swapped
  if (currentNonKeyAttributes.some((currentNonKeyAttribute) => !endNonKeyAttributes.includes(currentNonKeyAttribute))) return true;

  // nothing is different
  return false;
};

/**
 * Util function to check if the key schema(partition key & sort key) is changed
 * @param currentSchema current state of key schema
 * @param endSchema end state of key schema
 * @returns boolean indicates the change of key schema
 */
const isKeySchemaModified = (currentSchema: Array<KeySchemaElement>, endSchema: Array<CustomDDB.KeySchemaProperty>): boolean => {
  const currentHashKey = currentSchema.find((schema) => schema.KeyType === 'HASH');
  const endHashKey = endSchema.find((schema) => schema.keyType === 'HASH');
  // check if hash key attribute name is modified
  if (currentHashKey?.AttributeName !== endHashKey?.attributeName) return true;

  const currentSortKey = currentSchema.find((schema) => schema.KeyType === 'RANGE');
  const endSortKey = endSchema.find((schema) => schema.keyType === 'RANGE');

  // if a sort key doesn't exist in current or end state, then we're done, the schemas are the same
  if (currentSortKey === undefined && endSortKey === undefined) return false;

  // check if sort key removed or added
  if ((currentSortKey === undefined && endSortKey !== undefined) || (currentSortKey !== undefined && endSortKey === undefined)) return true;

  // check if sort key attribute name is modified
  if (currentSortKey?.AttributeName !== endSortKey?.attributeName) return true;

  // if we got here then the hash and range key are not modified
  return false;
};

/**
 * Util function to check if the time to live is modified between old and new table definitions
 * @param oldTtl TTL config from old table properties
 * @param endTtl TTL config from input table properties
 * @returns boolean indicaes the change of TTL
 */
export const isTtlModified = (
  oldTtl: CustomDDB.TimeToLiveSpecificationProperty | undefined,
  endTtl: CustomDDB.TimeToLiveSpecificationProperty | undefined,
): boolean => {
  if (oldTtl === undefined && endTtl === undefined) {
    return false;
  }
  if (oldTtl === undefined || endTtl === undefined) {
    return true;
  }
  return oldTtl.enabled !== endTtl.enabled || oldTtl.attributeName !== endTtl.attributeName;
};

/**
 * Get time to live specification for the given table
 * @param tableName table name
 * @returns time to live specification object
 */
const getTtlStatus = async (tableName: string): Promise<DescribeTimeToLiveCommandOutput> => {
  /**
   * This DescribeTimeToLive API call has a limit rate of 10 RPS.
   * The call is staggered randomly within 5s and called with exponential retries with max retry of 5.
   *
   * The CloudFormation has a hard limit of 2500 resources for nested stack within one operation (CUD).
   * The average of a model type nested stack is ~40, which indicates a number of 60 models is a reasonable test case.
   * If there are no staggering, the max retries needed is (60/10)-1=5
   *
   * However, in the worst case without staggering, the total wait time will come to pow(2, 5)-1=31s
   * When there is staggering with 5s applied, in the ideal case, 10 APIs are called per second and no exponential backoff will occur,
   * which only adds additional 5s
   *
   * The final approach is to combine both exponential backoff and initial random delay considering the tradeoffs mentioned
   */
  const initialDelay = Math.floor(Math.random() * 5 * 1000); // between 0 to 5s
  console.log(`Waiting for ${initialDelay} ms`);
  await sleep(initialDelay);
  const describeTimeToLiveResult = retry(
    async () => await ddbClient.describeTimeToLive({ TableName: tableName }),
    () => true,
    {
      times: 5,
      delayMS: 1000,
      exponentialBackoff: true,
    },
  );
  return describeTimeToLiveResult;
};

/**
 * Configuration for retry limits
 */
type RetrySettings = {
  times: number; // specifying 1 will execute func once and if not successful, retry one time
  delayMS: number; // delay between each attempt to execute func (there is no initial delay)
  timeoutMS: number; // total amount of time to retry execution
  stopOnError: boolean; // if retries should stop if func throws an error
  exponentialBackoff: boolean; // if retries should be executed based on exponential backoff
};

const defaultSettings: RetrySettings = {
  times: Infinity,
  delayMS: 1000 * 15, // 15 seconds
  timeoutMS: 1000 * 60 * 14, // 14 minutes
  stopOnError: false, // terminate the retries if a func calls throws an exception
  exponentialBackoff: false, // retries are executed based on the same interval
};

/**
 * Retries the function func until the success predicate returns true, or until one of the retry limits is met.
 * @param func The function to retry
 * @param successPredicate The predicate that determines successful output of func
 * @param settings Retry limits (defaults to defaultSettings above)
 * @param failurePredicate An optional predicate that determines that the retry operation has failed and should not be retried anymore
 */
const retry = async <T>(
  func: () => Promise<T>,
  successPredicate: (res?: T) => boolean,
  settings?: Partial<RetrySettings>,
  failurePredicate?: (res?: T) => boolean,
): Promise<T> => {
  const { times, delayMS, timeoutMS, stopOnError, exponentialBackoff } = {
    ...defaultSettings,
    ...settings,
  };

  let count = 0;
  let result: T;
  let terminate = false;
  const startTime = Date.now();

  do {
    try {
      result = await func();
      if (successPredicate(result)) {
        return result;
      }
      if (typeof failurePredicate === 'function' && failurePredicate(result)) {
        throw new Error('Retry-able function execution result matched failure predicate. Stopping retries.');
      }
      console.warn(`Retry-able function execution did not match success predicate. Result was [${JSON.stringify(result)}]. Retrying...`);
    } catch (err) {
      console.warn(`Retry-able function execution failed with [${(err as any).message || err}]`);
      if (stopOnError) {
        console.log('Stopping retries on error.');
      } else {
        console.log('Retrying...');
      }
      terminate = stopOnError;
    }
    count++;
    const sleepTime = exponentialBackoff ? delayMS * Math.pow(2, count - 1) : delayMS;
    await sleep(sleepTime);
  } while (!terminate && count <= times && Date.now() - startTime < timeoutMS);

  throw new Error('Retry-able function did not match predicate within the given retry constraints');
};

/**
 * Util function to sleep for seconds
 * @param milliseconds time to sleep
 * @returns void
 */
const sleep = async (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));
