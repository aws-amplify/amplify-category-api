import * as path from 'path';
import { LambdaClient, GetProvisionedConcurrencyConfigCommand } from '@aws-sdk/client-lambda';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import gql from 'graphql-tag';
import { initCDKProject, cdkDeploy, cdkDestroy } from '../commands';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { ONE_MINUTE } from '../utils/duration-constants';

export const testGraphQLAPIArrayAndObjects = (
  options: {
    region: string;
    connectionConfigName: string;
    dbController: SqlDatatabaseController;
    resourceNames: { sqlLambdaAliasName: string };
  },
  engine: ImportedRDSType,
): void => {
  describe(`RDS Model Directive - ${engine}`, () => {
    const projFolderName = `${engine}models`;
    const amplifyGraphqlSchema = `
      input AMPLIFY {
        engine: String = "postgres"
        globalAuthRule: AuthRule = { allow: public }
      }

      type Contact @refersTo(name: "contact") @model {
        id: Int! @primaryKey
        firstname: String
        lastname: String
        tags: [String]
        address: ContactAddress
      }

      type ContactAddress {
        city: String!
        state: String!
        street: String!
        zip: String!
      }
    `;
    const { region, connectionConfigName, dbController, resourceNames } = options;
    const templatePath = path.resolve(path.join(__dirname, '..', '__tests__', 'backends', 'sql-models'));

    let projRoot;
    let name;
    let outputs;
    let appSyncClient;

    beforeAll(async () => {
      projRoot = await createNewProjectDir(projFolderName);
      name = await initCDKProject(projRoot, templatePath);
      dbController.writeDbDetails(projRoot, connectionConfigName, amplifyGraphqlSchema);
      outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: ONE_MINUTE });
      const { awsAppsyncApiEndpoint: apiEndpoint, awsAppsyncApiKey: apiKey } = outputs[name];

      appSyncClient = new AWSAppSyncClient({
        url: apiEndpoint,
        region,
        disableOffline: true,
        auth: {
          type: AUTH_TYPE.API_KEY,
          apiKey,
        },
      });
    });

    afterAll(async () => {
      try {
        await cdkDestroy(projRoot, '--all');
      } catch (err) {
        console.log(`Error invoking 'cdk destroy': ${err}`);
      }

      deleteProjectDir(projRoot);
    });

    // CURDL on Contact table helpers
    const createContact = async (
      firstname: string,
      lastname: string,
      id?: number,
      tags?: string[],
      address?: Record<string, any>,
    ): Promise<Record<string, any>> => {
      const createMutation = /* GraphQL */ `
        mutation CreateContact($input: CreateContactInput!, $condition: ModelContactConditionInput) {
          createContact(input: $input, condition: $condition) {
            id
            firstname
            lastname
            tags
            address {
              city
              state
              street
              zip
            }
          }
        }
      `;
      const createInput = {
        input: {
          firstname,
          lastname,
          tags,
          address,
        },
      };

      if (id) {
        createInput.input['id'] = id;
      }

      const createResult: any = await appSyncClient.mutate({
        mutation: gql(createMutation),
        fetchPolicy: 'no-cache',
        variables: createInput,
      });

      return createResult;
    };

    const updateContact = async (
      id: number,
      firstname: string,
      lastname: string,
      tags?: string[],
      address?: Record<string, any>,
    ): Promise<Record<string, any>> => {
      const updateMutation = /* GraphQL */ `
        mutation UpdateContact($input: UpdateContactInput!, $condition: ModelContactConditionInput) {
          updateContact(input: $input, condition: $condition) {
            id
            firstname
            lastname
            tags
            address {
              city
              state
              street
              zip
            }
          }
        }
      `;
      const updateInput = {
        input: {
          id,
          firstname,
          lastname,
          tags,
          address,
        },
      };

      const updateResult: any = await appSyncClient.mutate({
        mutation: gql(updateMutation),
        fetchPolicy: 'no-cache',
        variables: updateInput,
      });

      return updateResult;
    };

    const deleteContact = async (id: number): Promise<Record<string, any>> => {
      const deleteMutation = /* GraphQL */ `
        mutation DeleteContact($input: DeleteContactInput!, $condition: ModelContactConditionInput) {
          deleteContact(input: $input, condition: $condition) {
            id
            firstname
            lastname
            tags
            address {
              city
              state
              street
              zip
            }
          }
        }
      `;
      const deleteInput = {
        input: {
          id,
        },
      };

      const deleteResult: any = await appSyncClient.mutate({
        mutation: gql(deleteMutation),
        fetchPolicy: 'no-cache',
        variables: deleteInput,
      });

      return deleteResult;
    };

    const getContact = async (id: number): Promise<Record<string, any>> => {
      const getQuery = /* GraphQL */ `
        query GetContact($id: Int!) {
          getContact(id: $id) {
            id
            firstname
            lastname
            tags
            address {
              city
              state
              street
              zip
            }
          }
        }
      `;
      const getInput = {
        id,
      };

      const getResult: any = await appSyncClient.query({
        query: gql(getQuery),
        fetchPolicy: 'no-cache',
        variables: getInput,
      });

      return getResult;
    };

    const listContacts = async (): Promise<Record<string, any>> => {
      const listQuery = /* GraphQL */ `
        query ListContact {
          listContacts {
            items {
              id
              firstname
              lastname
              tags
              address {
                city
                state
                street
                zip
              }
            }
          }
        }
      `;
      const listResult: any = await appSyncClient.query({
        query: gql(listQuery),
        fetchPolicy: 'no-cache',
      });

      return listResult;
    };

    test(`check CRUDL on contact table with array and objects - ${engine}`, async () => {
      const contact1 = await createContact('David', 'Smith', 1, ['tag1', 'tag2'], {
        city: 'Seattle',
        state: 'WA',
        street: '123 Main St',
        zip: '98115',
      });
      const contact2 = await createContact('Chris', 'Sundersingh', 2, ['tag3', 'tag4'], {
        city: 'Seattle',
        state: 'WA',
        street: '456 Another St',
        zip: '98119',
      });

      expect(contact1.data.createContact.id).toBeDefined();
      expect(contact1.data.createContact.firstname).toEqual('David');
      expect(contact1.data.createContact.lastname).toEqual('Smith');
      expect(contact1.data.createContact.tags).toEqual(expect.arrayContaining(['tag1', 'tag2']));
      expect(contact1.data.createContact.address).toEqual(
        expect.objectContaining({
          city: 'Seattle',
          state: 'WA',
          street: '123 Main St',
          zip: '98115',
        }),
      );

      expect(contact2.data.createContact.id).toBeDefined();
      expect(contact2.data.createContact.firstname).toEqual('Chris');
      expect(contact2.data.createContact.lastname).toEqual('Sundersingh');
      expect(contact2.data.createContact.tags).toEqual(expect.arrayContaining(['tag3', 'tag4']));
      expect(contact2.data.createContact.address).toEqual(
        expect.objectContaining({
          city: 'Seattle',
          state: 'WA',
          street: '456 Another St',
          zip: '98119',
        }),
      );

      const getContact1 = await getContact(contact1.data.createContact.id);
      expect(getContact1.data.getContact.id).toEqual(contact1.data.createContact.id);
      expect(getContact1.data.getContact.firstname).toEqual('David');
      expect(getContact1.data.getContact.lastname).toEqual('Smith');
      expect(getContact1.data.getContact.tags).toEqual(expect.arrayContaining(['tag1', 'tag2']));
      expect(getContact1.data.getContact.address).toEqual(
        expect.objectContaining({
          city: 'Seattle',
          state: 'WA',
          street: '123 Main St',
          zip: '98115',
        }),
      );

      const contact1Updated = await updateContact(contact1.data.createContact.id, 'David', 'Jones', ['tag1', 'tag2', 'tag3'], {
        city: 'Seattle',
        state: 'WA',
        street: '12345 Main St',
        zip: '98110',
      });
      expect(contact1Updated.data.updateContact.id).toEqual(contact1.data.createContact.id);
      expect(contact1Updated.data.updateContact.firstname).toEqual('David');
      expect(contact1Updated.data.updateContact.lastname).toEqual('Jones');
      expect(contact1Updated.data.updateContact.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
      expect(contact1Updated.data.updateContact.address).toEqual(
        expect.objectContaining({
          city: 'Seattle',
          state: 'WA',
          street: '12345 Main St',
          zip: '98110',
        }),
      );

      const getContact1Updated = await getContact(contact1.data.createContact.id);
      expect(getContact1Updated.data.getContact.id).toEqual(contact1.data.createContact.id);
      expect(getContact1Updated.data.getContact.firstname).toEqual('David');
      expect(getContact1Updated.data.getContact.lastname).toEqual('Jones');
      expect(getContact1Updated.data.getContact.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
      expect(getContact1Updated.data.getContact.address).toEqual(
        expect.objectContaining({
          city: 'Seattle',
          state: 'WA',
          street: '12345 Main St',
          zip: '98110',
        }),
      );

      const listContactsResult = await listContacts();
      expect(listContactsResult.data.listContacts.items.length).toEqual(2);
      expect(listContactsResult.data.listContacts.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: contact1.data.createContact.id,
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
            id: contact2.data.createContact.id,
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

      const deleteContact1 = await deleteContact(contact1.data.createContact.id);
      expect(deleteContact1.data.deleteContact.id).toEqual(contact1.data.createContact.id);
      expect(deleteContact1.data.deleteContact.firstname).toEqual('David');
      expect(deleteContact1.data.deleteContact.lastname).toEqual('Jones');
      expect(deleteContact1.data.deleteContact.tags).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
      expect(deleteContact1.data.deleteContact.address).toEqual(
        expect.objectContaining({
          city: 'Seattle',
          state: 'WA',
          street: '12345 Main St',
          zip: '98110',
        }),
      );

      const listContactsResultAfterDelete = await listContacts();
      expect(listContactsResultAfterDelete.data.listContacts.items.length).toEqual(1);
      expect(listContactsResultAfterDelete.data.listContacts.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: contact2.data.createContact.id,
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
