import { DynamoDB } from 'aws-sdk';
import type { CreateTableInput, KeySchema, Projection, TableDescription, UpdateTableInput } from 'aws-sdk/clients/dynamodb';

const ddbClient = new DynamoDB();

const log = (msg: string, ...other: any[]) => {
  console.log(
    msg,
    other.map((o) => (typeof o === 'object' ? JSON.stringify(o, undefined, 2) : o))
  );
};

export const onEvent = async (event: AWSCDKAsyncCustomResource.OnEventRequest): Promise<AWSCDKAsyncCustomResource.OnEventResponse | void> => {
  console.log(event)
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
          TableName: response.tableName
        },
      };
      console.log('Returning result: ', result);
      return result;
    case 'Update':
      if (!event.PhysicalResourceId) {
        throw new Error(`Could not find the physical ID for the updated resource`);
      }
      console.log('Fetching current table state');
      const describeTableResult = await ddbClient.describeTable({ TableName: event.PhysicalResourceId }).promise();
      if (!describeTableResult.Table) {
        throw new Error(`Could not find ${event.PhysicalResourceId} to update`);
      }
      // determine if table needs replacement
      if (isKeySchemaModified(describeTableResult.Table.KeySchema!, tableDef.KeySchema)) {
        console.log('Update requires replacement');

        console.log('Deleting the old table');
        await ddbClient.deleteTable({ TableName: event.PhysicalResourceId }).promise();
        await retry(
          async () => await doesTableExist(event.PhysicalResourceId!),
          (res) => res === false
        );
        console.log(`Table '${event.PhysicalResourceId}' does not exist. Deletion is finished.`);

        const createTableInput = toCreateTableInput(tableDef);
        const response = await createNewTable(createTableInput);
        result = {
          PhysicalResourceId: response.tableName,
          Data: {
            TableArn: response.tableArn,
            TableStreamArn: response.streamArn,
            TableName: response.tableName
          }
        };
        log('Returning result', result);
        return result;
      }
      // When normal updates happen
      const nextGsiUpdate = getNextGSIUpdate(describeTableResult.Table, tableDef);
      log('Computed next update', nextGsiUpdate);
      if (!nextGsiUpdate) {
        result = {
          PhysicalResourceId: event.PhysicalResourceId,
          Data: {
            TableArn: describeTableResult.Table.TableArn,
            TableStreamArn: describeTableResult.Table.LatestStreamArn,
            TableName: describeTableResult.Table.TableName
          }
        }
        return result; // nothing to update
      } 

      // TODO: merge gsi update with other table updates

      const updateTableInput: UpdateTableInput = nextGsiUpdate;
      log('Merged gsi update with other table updates', updateTableInput);

      console.log('Initiating table update');
      await ddbClient.updateTable(updateTableInput).promise();
      result = {
        PhysicalResourceId: event.PhysicalResourceId,
        Data: {
          TableArn: describeTableResult.Table.TableArn,
          TableStreamArn: describeTableResult.Table.LatestStreamArn,
          TableName: describeTableResult.Table.TableName
        }
      }
      return result;
    case 'Delete':
      console.log('Initiating table deletion');
      if (!event.PhysicalResourceId) {
        throw new Error(`Could not find the physical ID for the resource`);
      }
      try {
        await ddbClient.deleteTable({ TableName: event.PhysicalResourceId }).promise();
      } catch (err) {
        // TODO only swallow NotExist errors
      }
  }
  // after this function exits, the state machine will invoke isComplete in a loop until it returns finished or the state machine times out
};

export const isComplete = async (event: AWSCDKAsyncCustomResource.IsCompleteRequest): Promise<AWSCDKAsyncCustomResource.IsCompleteResponse> => {
  log('got event', event);
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
    async () => await ddbClient.describeTable({ TableName: event.PhysicalResourceId! }).promise(),
    (result) => !!result?.Table
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

  if (event.RequestType === 'Create') {
    // no additional updates required on create
    console.log('Create is finished');
    return finished;
  }

  // need to check if any more GSI updates are necessary
  const endState = extractTableInputFromEvent(event);
  const nextUpdate = getNextGSIUpdate(describeTableResult.Table, endState);
  log('Computed next update', nextUpdate);
  if (!nextUpdate) {
    // current state equals end state so we're done
    console.log('No additional updates needed. Update finished')
    return finished;
  }
  // don't need to merge gsi updates with other table updates here because those have already been applied in the first update
  console.log('Initiating table update');
  await ddbClient.updateTable(nextUpdate).promise();
  return notFinished;
  // a response of notFinished in this function will cause the function to be invoked again by the state machine after some time
};

const finished: AWSCDKAsyncCustomResource.IsCompleteResponse = {
  IsComplete: true,
};
const notFinished: AWSCDKAsyncCustomResource.IsCompleteResponse = {
  IsComplete: false,
};

// compares the currentState with the endState to determine a next update step that will get the table closer to the end state
export const getNextGSIUpdate = (currentState: TableDescription, endState: CustomDDB.Input): UpdateTableInput | undefined => {
  const endStateGSIs = endState.GlobalSecondaryIndexes || [];
  const endStateGSINames = endStateGSIs.map((gsi) => gsi.IndexName);

  const currentStateGSIs = currentState.GlobalSecondaryIndexes || [];
  const currentStateGSINames = currentStateGSIs.map((gsi) => gsi.IndexName);

  // function to identify any GSIs that need to be removed
  const gsiRequiresReplacementPredicate = (currentGSI: DynamoDB.GlobalSecondaryIndexDescription): boolean => {
    // check if the index has been removed entirely
    if (!endStateGSINames.includes(currentGSI.IndexName!)) return true;
    // get the end state of this GSI
    const respectiveEndStateGSI = endStateGSIs.find((endStateGSI) => endStateGSI.IndexName === currentGSI.IndexName)!;
    // detect if projection has changed
    if (isProjectionModified(currentGSI.Projection!, respectiveEndStateGSI.Projection!)) return true;
    // detect if key schema has changed
    if (isKeySchemaModified(currentGSI.KeySchema!, respectiveEndStateGSI.KeySchema!)) return true;
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
  const gsiRequiresCreationPredicate = (endStateGSI: DynamoDB.GlobalSecondaryIndex): boolean => !currentStateGSINames.includes(endStateGSI.IndexName);

  const gsiToAdd = endStateGSIs.find(gsiRequiresCreationPredicate);
  if (gsiToAdd) {
    const attributeNamesToInclude = gsiToAdd.KeySchema.map((schema) => schema.AttributeName);
    const gsiToAddAction = removeUndefinedAttributes(
      {
        IndexName: gsiToAdd.IndexName,
        KeySchema: gsiToAdd.KeySchema,
        Projection: gsiToAdd.Projection,
        ProvisionedThroughput: gsiToAdd.ProvisionedThroughput
      },
    ) as DynamoDB.CreateGlobalSecondaryIndexAction
    return {
      TableName: currentState.TableName!,
      AttributeDefinitions: endState.AttributeDefinitions.filter((def) => attributeNamesToInclude.includes(def.AttributeName)),
      GlobalSecondaryIndexUpdates: [
        {
          Create: gsiToAddAction,
        },
      ],
    };
  }

  // no more updates necessary
  return undefined;
};

type CreateTableResponse = {
  tableName: string;
  tableArn: string;
  streamArn?: string;
};

/**
 * Extract the custom DynamoDB table properties from event
 * @param event Event for onEvent or isComplete
 * @returns The table input for Custom dynamoDB Table
 */
const extractTableInputFromEvent = (
  event: AWSCDKAsyncCustomResource.OnEventRequest | AWSCDKAsyncCustomResource.IsCompleteRequest
  ): CustomDDB.Input => {
  // isolate the resource properties from the event and remove the service token
  const resourceProperties = { ...event.ResourceProperties } as Record<string, any> & { ServiceToken?: string };
  delete resourceProperties.ServiceToken;

  // cast the remaining resource properties to the DynamoDB API call input type
  const tableDef = convertStringToBooleanOrNumber(resourceProperties) as CustomDDB.Input;
  return tableDef;
}
/**
 * Util function to convert string values to the correct form
 * Such as 'true' to true, '5' to 5
 * @param obj Input object
 * @returns Oject with its values converted to the correct form of boolean or number
 */
const convertStringToBooleanOrNumber = (obj: Record<string, any>): Record<string, any> => {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      // If the property is an object, recursively call the function
      obj[key] = convertStringToBooleanOrNumber(obj[key]);
    } else if (typeof obj[key] === 'string') {
      if ((obj[key] === 'true' || obj[key] === 'false')) {
        // If the property is a string with value 'true' or 'false', convert it to a boolean
        obj[key] = obj[key] === 'true';
      }
      else if (!isNaN(Number(obj[key]))) {
        // If the property is a string that can be parsed into a number, convert it to a number
        obj[key] = Number(obj[key]);
      }
    }
  }
  return obj;
}
/**
 * Util function to remove undefined values from root level of object
 * @param obj Input Object
 * @returns obj without undefined attributes
 */
const removeUndefinedAttributes = (obj: Record<string, any>): Record<string, any> => {
  for (const key in obj) {
    if (obj[key] === undefined) {
      // Use the delete operator to remove the attribute if it's undefined
      delete obj[key];
    }
  }
  return obj;
}

const toCreateTableInput = (props: any): CreateTableInput => {
  const createTableInput: CreateTableInput = {
    TableName: props.TableName,
    AttributeDefinitions: props.AttributeDefinitions,
    KeySchema: props.KeySchema,
    GlobalSecondaryIndexes: props.GlobalSecondaryIndexes,
    BillingMode: props.BillingMode,
    StreamSpecification: props.StreamSpecification
      ? {
        StreamEnabled: true,
        StreamViewType: props.StreamSpecification.StreamViewType
      } : undefined,
    ProvisionedThroughput: props.ProvisionedThroughput,
    SSESpecification: props.SSESpecification ? { Enabled: props.SSESpecification.sseEnabled } : undefined
  };
  return removeUndefinedAttributes(createTableInput) as CreateTableInput;
}

const createNewTable = async (input: CreateTableInput): Promise<CreateTableResponse> => {
  const tableName = input.TableName;
  const createTableInput: CreateTableInput = input;
  const result = await ddbClient.createTable(createTableInput).promise();
  return { tableName, tableArn: result.TableDescription?.TableArn!, streamArn: result.TableDescription?.LatestStreamArn };
};

const doesTableExist = async (tableName: string): Promise<boolean> => {
  try {
    await ddbClient.describeTable({ TableName: tableName }).promise();
    return true; // Table exists
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      return false; // Table does not exist
    }
    throw error; // Handle other errors
  }
}

const isProjectionModified = (currentProjection: Projection, endProjection: Projection): boolean => {
  // first see if the projection type is changed
  if (currentProjection.ProjectionType !== endProjection.ProjectionType) return true;

  // if projection type is all for both then no need to check projection attributes
  if (currentProjection.ProjectionType === 'ALL') return false;

  const currentNonKeyAttributes = currentProjection.NonKeyAttributes || [];
  const endNonKeyAttributes = currentProjection.NonKeyAttributes || [];
  // if an attribute has been added or removed
  if (currentNonKeyAttributes.length !== endNonKeyAttributes.length) return true;

  // if an attribute has been swapped
  if (currentNonKeyAttributes.some((currentNonKeyAttribute) => !endNonKeyAttributes.includes(currentNonKeyAttribute))) return true;

  // nothing is different
  return false;
};

const isKeySchemaModified = (currentSchema: KeySchema, endSchema: KeySchema): boolean => {
  const currentHashKey = currentSchema.find((schema) => schema.KeyType === 'HASH');
  const endHashKey = endSchema.find((schema) => schema.KeyType === 'HASH');
  // check if hash key attribute name is modified
  if (currentHashKey?.AttributeName !== endHashKey?.AttributeName) return true;

  const currentSortKey = currentSchema.find((schema) => schema.KeyType === 'RANGE');
  const endSortKey = endSchema.find((schema) => schema.KeyType === 'RANGE');

  // if a sort key doesn't exist in current or end state, then we're done, the schemas are the same
  if (currentSortKey === undefined && endSortKey === undefined) return false;

  // check if sort key removed or added
  if ((currentSortKey === undefined && endSortKey !== undefined) || (currentSortKey !== undefined && endSortKey === undefined)) return true;

  // check if sort key attribute name is modified
  if (currentSortKey?.AttributeName !== endSortKey?.AttributeName) return true;

  // if we got here then the hash and range key are not modified
  return false;
};

/**
 * Configuration for retry limits
 */
export type RetrySettings = {
  times: number; // specifying 1 will execute func once and if not successful, retry one time
  delayMS: number; // delay between each attempt to execute func (there is no initial delay)
  timeoutMS: number; // total amount of time to retry execution
  stopOnError: boolean; // if retries should stop if func throws an error
};

const defaultSettings: RetrySettings = {
  times: Infinity,
  delayMS: 1000 * 15, // 15 seconds
  timeoutMS: 1000 * 60 * 14, // 14 minutes
  stopOnError: false, // terminate the retries if a func calls throws an exception
};

/**
 * Retries the function func until the predicate pred returns true, or until one of the retry limits is met.
 * @param func The function to retry
 * @param successPredicate The predicate that determines successful output of func
 * @param settings Retry limits (defaults to defaultSettings above)
 * @param failurePredicate An optional predicate that determines that the retry operation has failed and should not be retried anymore
 */
const retry = async <T>(
  func: () => Promise<T>,
  successPredicate: (res?: T) => boolean,
  settings?: Partial<RetrySettings>,
  failurePredicate?: (res?: T) => boolean
): Promise<T> => {
  const { times, delayMS, timeoutMS, stopOnError } = {
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
    await sleep(delayMS);
  } while (!terminate && count <= times && Date.now() - startTime < timeoutMS);

  throw new Error('Retry-able function did not match predicate within the given retry constraints');
};

const sleep = async (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));