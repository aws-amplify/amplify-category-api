import { LambdaClient, GetProvisionedConcurrencyConfigCommand } from '@aws-sdk/client-lambda';
import { AUTH_TYPE } from 'aws-appsync';
import { TestConfigOutput } from '../../../utils/sql-test-config-helper';
import { AppSyncClients, configureAppSyncClients } from '../../../utils/sql-appsync-client-helper';
import { CRUDLHelper } from '../../../utils/sql-crudl-helper';
import { contactFieldMap } from './field-map';

export class ArrayObjectsTester {
  private readonly testConfigOutput: TestConfigOutput;
  private appSyncClients: AppSyncClients;

  constructor(testConfigOutput: TestConfigOutput) {
    this.testConfigOutput = testConfigOutput;
  }

  public initialize = async (): Promise<void> => {
    this.appSyncClients = await configureAppSyncClients(this.testConfigOutput);
  };

  public testCRUDLOnContactTableWithArrayAndObjects = async (): Promise<void> => {
    const contactTableCRUDLHelper = new CRUDLHelper(
      this.appSyncClients[this.testConfigOutput.authType as AUTH_TYPE.API_KEY],
      'Contact',
      'Contacts',
      contactFieldMap,
    );

    // Create Contact Mutation
    const contact1 = await contactTableCRUDLHelper.create({
      id: 1,
      firstname: 'David',
      lastname: 'Smith',
      tags: ['tag1', 'tag2'],
      address: {
        city: 'Seattle',
        state: 'WA',
        street: '123 Main St',
        zip: '98115',
      },
    });
    const contact2 = await contactTableCRUDLHelper.create({
      id: 2,
      firstname: 'Chris',
      lastname: 'Sundersingh',
      tags: ['tag3', 'tag4'],
      address: {
        city: 'Seattle',
        state: 'WA',
        street: '456 Another St',
        zip: '98119',
      },
    });

    expect(contact1).toBeDefined();
    expect(contact1.id).toEqual(1);
    expect(contact1.firstname).toEqual('David');
    expect(contact1.lastname).toEqual('Smith');
    expect(contact1.tags).toEqual(expect.arrayContaining(['tag1', 'tag2']));
    expect(contact1.address).toEqual(
      expect.objectContaining({
        city: 'Seattle',
        state: 'WA',
        street: '123 Main St',
        zip: '98115',
      }),
    );

    // Get Contact Query
    const getContact1 = await contactTableCRUDLHelper.get({ id: contact1.id });

    expect(getContact1.id).toEqual(contact1.id);
    expect(getContact1.firstname).toEqual('David');
    expect(getContact1.lastname).toEqual('Smith');
    expect(getContact1.tags).toEqual(expect.arrayContaining(['tag1', 'tag2']));
    expect(getContact1.address).toEqual(
      expect.objectContaining({
        city: 'Seattle',
        state: 'WA',
        street: '123 Main St',
        zip: '98115',
      }),
    );

    // Update Contact Query
    const updateContact1 = await contactTableCRUDLHelper.update({
      id: contact1.id,
      firstname: 'David',
      lastname: 'Jones',
      tags: ['tag1', 'tag2', 'tag3'],
      address: {
        city: 'Seattle',
        state: 'WA',
        street: '12345 Main St',
        zip: '98110',
      },
    });

    expect(updateContact1.id).toEqual(contact1.id);
    expect(updateContact1.firstname).toEqual('David');
    expect(updateContact1.lastname).toEqual('Jones');
    expect(updateContact1.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
    expect(updateContact1.address).toEqual(
      expect.objectContaining({
        city: 'Seattle',
        state: 'WA',
        street: '12345 Main St',
        zip: '98110',
      }),
    );

    // Get Contact Query after update
    const getUpdatedContact1 = await contactTableCRUDLHelper.get({ id: contact1.id });

    expect(getUpdatedContact1.id).toEqual(contact1.id);
    expect(getUpdatedContact1.firstname).toEqual('David');
    expect(getUpdatedContact1.lastname).toEqual('Jones');
    expect(getUpdatedContact1.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
    expect(getUpdatedContact1.address).toEqual(
      expect.objectContaining({
        city: 'Seattle',
        state: 'WA',
        street: '12345 Main St',
        zip: '98110',
      }),
    );

    // List Contact Query
    const listContact = await contactTableCRUDLHelper.list();

    expect(listContact.items.length).toEqual(2);
    expect(listContact.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: contact1.id,
          firstname: 'David',
          lastname: 'Jones',
          tags: expect.arrayContaining(['tag1', 'tag2', 'tag3']),
          address: expect.objectContaining({
            city: 'Seattle',
            state: 'WA',
            street: '12345 Main St',
            zip: '98110',
          }),
        }),
        expect.objectContaining({
          id: contact2.id,
          firstname: 'Chris',
          lastname: 'Sundersingh',
          tags: expect.arrayContaining(['tag3', 'tag4']),
          address: expect.objectContaining({
            city: 'Seattle',
            state: 'WA',
            street: '456 Another St',
            zip: '98119',
          }),
        }),
      ]),
    );

    // Delete Contact Mutation
    const deleteContact1 = await contactTableCRUDLHelper.delete({ id: contact1.id });

    expect(deleteContact1.id).toEqual(contact1.id);
    expect(deleteContact1.firstname).toEqual('David');
    expect(deleteContact1.lastname).toEqual('Jones');
    expect(deleteContact1.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
    expect(deleteContact1.address).toEqual(
      expect.objectContaining({
        city: 'Seattle',
        state: 'WA',
        street: '12345 Main St',
        zip: '98110',
      }),
    );

    // List Contact Query after delete
    const listContactAfterDelete = await contactTableCRUDLHelper.list();

    expect(listContactAfterDelete.items.length).toEqual(1);
    expect(listContactAfterDelete.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: contact2.id,
          firstname: 'Chris',
          lastname: 'Sundersingh',
          tags: expect.arrayContaining(['tag3', 'tag4']),
          address: expect.objectContaining({
            city: 'Seattle',
            state: 'WA',
            street: '456 Another St',
            zip: '98119',
          }),
        }),
      ]),
    );
  };

  public testSQLLambdaProvisionedConcurrency = async (): Promise<void> => {
    const client = new LambdaClient({ region: this.testConfigOutput.region });
    const command = new GetProvisionedConcurrencyConfigCommand({
      FunctionName: this.testConfigOutput.lambdaFunctionName,
      Qualifier: this.testConfigOutput.lambdaAliasName,
    });
    const response = await client.send(command);
    expect(response.RequestedProvisionedConcurrentExecutions).toEqual(2);
  };
}
