import * as path from 'path';
import { LambdaClient, GetProvisionedConcurrencyConfigCommand } from '@aws-sdk/client-lambda';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { schema as generateSchema } from './tests-sources/sql-array-objects/provider';
import { contactFieldMap } from './tests-sources/sql-array-objects/field-map';
import { StackConfig } from '../utils/sql-stack-config';
import { CRUDLHelper } from '../utils/sql-crudl-helper';
import { ONE_MINUTE } from '../utils/duration-constants';

export const testGraphQLAPIArrayAndObjects = (
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
    let projRoot;
    let region, lambdaFunctionName, lambdaAliasName;

    let dbController: SqlDatatabaseController;
    let contactTableCRUDLHelper: CRUDLHelper;

    beforeAll(async () => {
      ({
        region,
        dbController,
        resourceNames: { sqlLambdaAliasName: lambdaAliasName },
      } = options);
      const { projFolderName, connectionConfigName } = options;

      const templatePath = path.resolve(path.join(__dirname, '..', '__tests__', 'backends', 'sql-configurable-stack'));

      projRoot = await createNewProjectDir(projFolderName);
      const name = await initCDKProject(projRoot, templatePath);

      const stackConfig: StackConfig = {
        schema: generateSchema(engine),
        authMode: AUTH_TYPE.API_KEY,
        useSandbox: true,
      };

      dbController.writeDbDetails(projRoot, connectionConfigName, stackConfig);
      const outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: ONE_MINUTE });
      const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];
      lambdaFunctionName = outputs[name].SQLFunctionName;

      const appSyncClient = new AWSAppSyncClient({
        url: apiEndpoint,
        region,
        disableOffline: true,
        auth: {
          type: AUTH_TYPE.API_KEY,
          apiKey,
        },
      });

      contactTableCRUDLHelper = new CRUDLHelper(appSyncClient, 'Contact', 'Contacts', contactFieldMap);
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

    test(`check CRUDL on contact table with array and objects - ${engine}`, async () => {
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
    });

    test(`check SQL Lambda provisioned concurrency - ${engine}`, async () => {
      const client = new LambdaClient({ region });
      const command = new GetProvisionedConcurrencyConfigCommand({
        FunctionName: lambdaFunctionName,
        Qualifier: lambdaAliasName,
      });
      const response = await client.send(command);
      expect(response.RequestedProvisionedConcurrentExecutions).toEqual(2);
    });
  });
};
