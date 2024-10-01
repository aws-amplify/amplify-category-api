import * as path from 'path';
import { LambdaClient, GetProvisionedConcurrencyConfigCommand } from '@aws-sdk/client-lambda';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { createNewProjectDir, deleteProjectDir, getRDSTableNamePrefix } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { CRUDLHelper } from '../utils/sql-crudl-helper';
import { ONE_MINUTE } from '../utils/duration-constants';

export const testGraphQLAPIAutoIncrement = (
  options: {
    projFolderName: string;
    region: string;
    connectionConfigName: string;
    dbController: SqlDatatabaseController;
    resourceNames: { sqlLambdaAliasName: string };
  },
  testBlockDescription: string,
  engine: ImportedRDSType,
): void => {
  describe(`${testBlockDescription} - ${engine}`, () => {
    // In particular, we want to verify that the new CREATE operation
    // is allowed to omit the primary key field, and that the primary key
    // we get back is the correct, db generated value.
    // NOTE: Expects underlying orderNumber column to be a serial primary key in Postgres table
    const amplifyGraphqlSchema = `
      type CoffeeQueue @model @refersTo(name: "${getRDSTableNamePrefix()}coffee_queue") {
        orderNumber: Int! @primaryKey @default
        order: String!
        customer: String
      }
    `;

    const { projFolderName, region, connectionConfigName, dbController, resourceNames } = options;
    const templatePath = path.resolve(path.join(__dirname, '..', '__tests__', 'backends', 'sql-models'));

    let projRoot: string;
    let name: string;
    let outputs: Promise<any>;
    let coffeeQueueTableCRUDLHelper: CRUDLHelper;

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      name = await initCDKProject(projRoot, templatePath);
      dbController.writeDbDetails(projRoot, connectionConfigName, amplifyGraphqlSchema);
      outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: ONE_MINUTE });
      const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

      const appSyncClient = new AWSAppSyncClient({
        url: apiEndpoint,
        region,
        disableOffline: true,
        auth: {
          type: AUTH_TYPE.API_KEY,
          apiKey,
        },
      });

      coffeeQueueTableCRUDLHelper = new CRUDLHelper(appSyncClient, 'CoffeeQueue', 'CoffeeQueues', ['orderNumber', 'order', 'customer']);
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
        await dbController.clearDatabase();
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    test(`check CRUDL on coffee queue table with auto increment primary key - ${engine}`, async () => {
      // Order Coffee Mutation
      const createCoffeeOrder1 = await coffeeQueueTableCRUDLHelper.create({ customer: 'petesv', order: 'cold brew' });

      expect(createCoffeeOrder1).toBeDefined();
      expect(createCoffeeOrder1.orderNumber).toBeDefined();
      expect(createCoffeeOrder1.customer).toEqual('petesv');
      expect(createCoffeeOrder1.order).toEqual('cold brew');

      // Get Todo Query
      const getCoffeeOrder1 = await coffeeQueueTableCRUDLHelper.get({ orderNumber: createCoffeeOrder1.orderNumber });

      expect(getCoffeeOrder1.orderNumber).toEqual(createCoffeeOrder1.orderNumber);
      expect(getCoffeeOrder1.customer).toEqual(createCoffeeOrder1.customer);

      // Update Todo Mutation
      const updateCoffeeOrder1 = await coffeeQueueTableCRUDLHelper.update({
        orderNumber: createCoffeeOrder1.orderNumber,
        customer: 'petesv',
        order: 'hot brew',
      });

      expect(updateCoffeeOrder1.orderNumber).toEqual(createCoffeeOrder1.orderNumber);
      expect(updateCoffeeOrder1.order).toEqual('hot brew');

      // Get Todo Query after update
      const getUpdatedCoffeeOrder1 = await coffeeQueueTableCRUDLHelper.get({ orderNumber: createCoffeeOrder1.orderNumber });

      expect(getUpdatedCoffeeOrder1.orderNumber).toEqual(createCoffeeOrder1.orderNumber);
      expect(getUpdatedCoffeeOrder1.order).toEqual('hot brew');

      // List Todo Query
      const createCofffeeOrder2 = await coffeeQueueTableCRUDLHelper.create({ order: 'latte' });
      const listTodo = await coffeeQueueTableCRUDLHelper.list();

      expect(listTodo.items.length).toEqual(2);
      expect(listTodo.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            orderNumber: getUpdatedCoffeeOrder1.orderNumber,
            order: 'hot brew',
          }),
          expect.objectContaining({
            orderNumber: createCofffeeOrder2.orderNumber,
            order: 'latte',
          }),
        ]),
      );

      // Delete Todo Mutation
      const deleteCoffeeOrder1 = await coffeeQueueTableCRUDLHelper.delete({ orderNumber: createCoffeeOrder1.orderNumber });

      expect(deleteCoffeeOrder1.orderNumber).toEqual(createCoffeeOrder1.orderNumber);
      expect(deleteCoffeeOrder1.order).toEqual('hot brew');

      const getDeletedCoffeeOrder1 = await coffeeQueueTableCRUDLHelper.get({ orderNumber: createCoffeeOrder1.orderNumber });

      expect(getDeletedCoffeeOrder1).toBeNull();

      // List Todo Query after delete
      const listCoffeeOrdersAfterDelete = await coffeeQueueTableCRUDLHelper.list();

      expect(listCoffeeOrdersAfterDelete.items.length).toEqual(1);
      expect(listCoffeeOrdersAfterDelete.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            orderNumber: createCofffeeOrder2.orderNumber,
            order: 'latte',
          }),
        ]),
      );

      // Check invalid CRUD operation returns generic error message
      const createTodo6 = await coffeeQueueTableCRUDLHelper.create({ order: 'mocha' });

      try {
        await coffeeQueueTableCRUDLHelper.create({ orderNumber: createTodo6.orderNumber, order: 'americano' });
      } catch (error) {
        coffeeQueueTableCRUDLHelper.checkGenericError(error?.message);
      }

      const invalidOrderNumber = 99999999;

      try {
        await coffeeQueueTableCRUDLHelper.get({ orderNumber: invalidOrderNumber });
      } catch (error) {
        coffeeQueueTableCRUDLHelper.checkGenericError(error?.message);
      }

      try {
        await coffeeQueueTableCRUDLHelper.update({ orderNumber: invalidOrderNumber, order: 'cortado' });
      } catch (error) {
        coffeeQueueTableCRUDLHelper.checkGenericError(error?.message);
      }

      try {
        await coffeeQueueTableCRUDLHelper.delete({ orderNumber: invalidOrderNumber });
      } catch (error) {
        coffeeQueueTableCRUDLHelper.checkGenericError(error?.message);
      }
    });

    test(`check SQL Lambda provisioned concurrency - ${engine}`, async () => {
      const client = new LambdaClient({ region });
      const functionName = outputs[name].SQLFunctionName;
      const command = new GetProvisionedConcurrencyConfigCommand({
        FunctionName: functionName,
        Qualifier: resourceNames.sqlLambdaAliasName,
      });
      const response = await client.send(command);
      expect(response.RequestedProvisionedConcurrentExecutions).toEqual(2);
    });
  });
};
