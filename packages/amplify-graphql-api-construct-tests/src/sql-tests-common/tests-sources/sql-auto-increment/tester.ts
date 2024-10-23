import { AUTH_TYPE } from 'aws-appsync';
import { TestConfigOutput } from '../../../utils/sql-test-config-helper';
import { AppSyncClients, configureAppSyncClients } from '../../../utils/sql-appsync-client-helper';
import { CRUDLHelper } from '../../../utils/sql-crudl-helper';
import { coffeeQueueFieldMap } from './field-map';

export class AutoIncrementTester {
  private readonly testConfigOutput: TestConfigOutput;
  private appSyncClients: AppSyncClients;

  constructor(testConfigOutput: TestConfigOutput) {
    this.testConfigOutput = testConfigOutput;
  }

  public initialize = async (): Promise<void> => {
    this.appSyncClients = await configureAppSyncClients(this.testConfigOutput);
  };

  public testCRUDLOnCoffeeQueueTableWithAutoIncrementPK = async (): Promise<void> => {
    const coffeeQueueTableCRUDLHelper = new CRUDLHelper(
      this.appSyncClients[this.testConfigOutput.authType as AUTH_TYPE.API_KEY],
      'CoffeeQueue',
      'CoffeeQueues',
      coffeeQueueFieldMap,
    );

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

    // List Todo Query & Create with custom SERIAL field value
    const customOrderNumber = 42;
    const createCofffeeOrder2 = await coffeeQueueTableCRUDLHelper.create({ orderNumber: customOrderNumber, order: 'latte' });
    expect(createCofffeeOrder2.orderNumber).toEqual(customOrderNumber);

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
      // Invalid because the pk (orderNumber) already exists
      await coffeeQueueTableCRUDLHelper.create({ orderNumber: createTodo6.orderNumber, order: 'americano' });
    } catch (error) {
      coffeeQueueTableCRUDLHelper.checkGenericError(error?.message);
    }

    const biggerThanAnyExistingOrderNumber = 99999999;

    try {
      await coffeeQueueTableCRUDLHelper.get({ orderNumber: biggerThanAnyExistingOrderNumber });
    } catch (error) {
      coffeeQueueTableCRUDLHelper.checkGenericError(error?.message);
    }

    try {
      await coffeeQueueTableCRUDLHelper.update({ orderNumber: biggerThanAnyExistingOrderNumber, order: 'cortado' });
    } catch (error) {
      coffeeQueueTableCRUDLHelper.checkGenericError(error?.message);
    }

    try {
      await coffeeQueueTableCRUDLHelper.delete({ orderNumber: biggerThanAnyExistingOrderNumber });
    } catch (error) {
      coffeeQueueTableCRUDLHelper.checkGenericError(error?.message);
    }
  };
}
