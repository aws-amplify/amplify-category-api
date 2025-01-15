import AWSAppSyncClient from 'aws-appsync';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { CRUDLHelper } from '../../../utils/sql-crudl-helper';
import * as FieldMaps from './field-map';
import { UserBasedClientTesterBase } from './user-based-client-tester-base';

export class DynamicModelAuthTester extends UserBasedClientTesterBase {
  private testValidCustomOperations = async (appSyncClient: AWSAppSyncClient<NormalizedCacheObject>, modelName: string): Promise<void> => {
    const customCRUDLHelper = new CRUDLHelper(appSyncClient);

    const createData = {
      id: Date.now().toString(),
      content: 'Todo',
    };
    const createMutation = /* GraphQL */ `
      mutation CreateTodoCustom($id: ID!, $content: String) {
        add${modelName}(id: $id, content: $content) {
          id
          content
        }
      }
    `;
    const createResult = await customCRUDLHelper.runCustomMutation(createMutation, createData);
    expect(createResult[`add${modelName}`]).toBeDefined();

    const getQuery = /* GraphQL */ `
      query GetTodoCustom($id: ID!) {
        customGet${modelName}(id: $id) {
          id
          content
        }
      }
    `;
    const getResult = await customCRUDLHelper.runCustomQuery(getQuery, { id: createData.id });
    expect(getResult[`customGet${modelName}`]).toHaveLength(1);
    expect(getResult[`customGet${modelName}`][0].id).toEqual(createData.id);
    expect(getResult[`customGet${modelName}`][0].content).toEqual(createData.content);
  };

  private testInvalidCustomOperations = async (
    appSyncClient: AWSAppSyncClient<NormalizedCacheObject>,
    modelName: string,
  ): Promise<void> => {
    const customCRUDLHelper = new CRUDLHelper(appSyncClient);

    const createData = {
      id: Date.now().toString(),
      content: 'Todo',
    };
    const createMutation = /* GraphQL */ `
      mutation CreateTodoCustom($id: ID!, $content: String) {
        add${modelName}(id: $id, content: $content) {
          id
          content
        }
      }
    `;
    await expect(customCRUDLHelper.runCustomMutation(createMutation, createData)).rejects.toThrow(
      `GraphQL error: Not Authorized to access add${modelName} on type Mutation`,
    );

    const getQuery = /* GraphQL */ `
      query GetTodoCustom($id: ID!) {
        customGet${modelName}(id: $id) {
          id
          content
        }
      }
    `;
    await expect(customCRUDLHelper.runCustomQuery(getQuery, { id: createData.id })).rejects.toThrow(
      `GraphQL error: Not Authorized to access customGet${modelName} on type Query`,
    );
  };

  public testLoggedInUserCrudOperations = async (): Promise<void> => {
    await this.testValidCRUDL('TodoPrivate', FieldMaps.TodoPrivateFieldMap);
  };

  public testRecordOwnerCrudOperationsWithDefaultOwnerField = async (): Promise<void> => {
    await this.testValidCRUDL('TodoOwner', FieldMaps.TodoOwnerFieldMap, { owner: true });
  };

  public testNonRecordOwnerCannotAccessWithDefaultOwnerField = async (): Promise<void> => {
    await this.testInvalidCRUDL('TodoOwner', FieldMaps.TodoOwnerFieldMap, { owner: true }, { owner: this.userName2 });
  };

  public testStoreOwnerInCustomField = async (): Promise<void> => {
    await this.testValidCRUDL('TodoOwnerFieldString', FieldMaps.TodoOwnerFieldStringFieldMap, { author: true }, { author: this.userName1 });
  };

  public testNonOwnerCannotPretendToBeOwner = async (): Promise<void> => {
    await this.testInvalidCRUDL(
      'TodoOwnerFieldString',
      FieldMaps.TodoOwnerFieldStringFieldMap,
      { author: true },
      { author: this.userName1 },
    );
  };

  public testListOwnersMemberCrudOperations = async (): Promise<void> => {
    await this.testValidCRUDL('TodoOwnerFieldList', FieldMaps.TodoOwnerFieldListFieldMap, {}, {}, { authors: [this.userName1] });
  };

  public testNonOwnerCannotAddThemselvesToList = async (): Promise<void> => {
    await this.testInvalidCRUDL(
      'TodoOwnerFieldList',
      FieldMaps.TodoOwnerFieldListFieldMap,
      {},
      { authors: [this.userName1, this.userName2] },
      { authors: [this.userName1] },
    );
  };

  public testOwnerCanAddAnotherUserToList = async (): Promise<void> => {
    await this.testValidCRUDL(
      'TodoOwnerFieldList',
      FieldMaps.TodoOwnerFieldListFieldMap,
      {},
      { authors: [this.userName1, this.userName2] },
      { authors: [this.userName1, this.userName2] },
      true,
    );
  };

  public testStaticGroupUserCrudOperations = async (): Promise<void> => {
    await this.testValidCRUDL('TodoStaticGroup', FieldMaps.TodoStaticGroupFieldMap);
  };

  public testNonStaticGroupUserCrudOperations = async (): Promise<void> => {
    await this.testInvalidCRUDL('TodoStaticGroup', FieldMaps.TodoStaticGroupFieldMap);
  };

  public testGroupUserCrudOperations = async (): Promise<void> => {
    await this.testValidCRUDL(
      'TodoGroupFieldString',
      FieldMaps.TodoGroupFieldStringFieldMap,
      {},
      { groupField: this.groupName1 },
      { groupField: this.groupName1 },
    );
  };

  public testUsersCannotSpoofGroupMembership = async (): Promise<void> => {
    await this.testInvalidCRUDL(
      'TodoGroupFieldString',
      FieldMaps.TodoGroupFieldStringFieldMap,
      {},
      { groupField: this.groupName2 },
      { groupField: this.groupName1 },
    );
  };

  public testListGroupUserCrudOperations = async (): Promise<void> => {
    await this.testValidCRUDL(
      'TodoGroupFieldList',
      FieldMaps.TodoGroupFieldListFieldMap,
      {},
      { groupsField: [this.groupName1] },
      { groupsField: [this.groupName1] },
    );
  };

  public testNotAllowedGroupUserCannotAccess = async (): Promise<void> => {
    await this.testInvalidCRUDL(
      'TodoGroupFieldList',
      FieldMaps.TodoGroupFieldListFieldMap,
      {},
      { groupsField: [this.groupName1, this.groupName2] },
      { groupsField: [this.groupName1] },
    );
  };

  public testAdminUserCanGiveAccessToAnotherUserGroup = async (): Promise<void> => {
    await this.testValidCRUDL(
      'TodoGroupFieldList',
      FieldMaps.TodoGroupFieldListFieldMap,
      {},
      { groupsField: [this.groupName1, this.groupName2] },
      { groupsField: [this.groupName1, this.groupName2] },
      true,
    );
  };

  public testLoggedInUserCustomOperations = async (): Promise<void> => {
    await this.testValidCustomOperations(this.appSyncClient1, 'TodoPrivate');
  };

  public testStaticGroupUserCustomOperations = async (): Promise<void> => {
    await this.testValidCustomOperations(this.appSyncClient1, 'TodoStaticGroup');
  };

  public testNonStaticGroupUserCustomOperations = async (): Promise<void> => {
    await this.testInvalidCustomOperations(this.appSyncClient2, 'TodoStaticGroup');
  };

  public testOwnerRileWithNullGroupsFieldAndMultipleDynamicAuth = async (): Promise<void> => {
    await this.testValidCRUDL(
      'TodoOwnerAndGroup',
      FieldMaps.TodoOwnerAndGroupFieldMap,
      {},
      {},
      {
        id: Date.now().toString(),
        content: 'Todo',
        groupsField: null,
        owners: [this.userName1],
      },
    );
  };
}
