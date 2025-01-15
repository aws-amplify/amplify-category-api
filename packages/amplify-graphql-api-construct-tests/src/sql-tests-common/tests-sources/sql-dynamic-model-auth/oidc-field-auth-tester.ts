import AWSAppSyncClient from 'aws-appsync';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { CRUDLHelper, FieldMap, valueOrFirstValue } from '../../../utils';
import * as FieldMaps from './field-map';
import { UserBasedClientTesterBase } from './user-based-client-tester-base';

export class OidcFieldAuthTester extends UserBasedClientTesterBase {
  /**
   * Tests valid CRUDL operations on the specified model
   * - Creates initial record using `initialFieldValues`
   * - Updates record using `updateFieldValues`
   * - Lists record
   * - Deletes record
   *
   * If `secondClientEnabled` is true, performs the update, list, and delete operations using the second user client rather than the first.
   */
  protected testValidCRUDL = async (
    modelName: string,
    fieldMap: FieldMap,
    fieldsToCheck: Record<string, boolean> = {},
    updateFieldValues: Record<string, string | string[]> = {},
    initialFieldValues: Record<string, string | string[]> = {},
    secondClientEnabled = false,
  ): Promise<void> => {
    const modelCRUDLHelper1 = new CRUDLHelper(this.appSyncClient1, modelName, `${modelName}s`, fieldMap);
    const modelCRUDLHelper2 = new CRUDLHelper(this.appSyncClient2, modelName, `${modelName}s`, fieldMap);

    const createData: Record<string, string | string[]> = {
      ...initialFieldValues,
    };

    // Create data using the first client, which will be set as the owner in the absence of an override to the contrary
    const createDataResult = await modelCRUDLHelper1.create(createData);

    this.checkCreateData(createDataResult, fieldsToCheck);
    this.completeCreateData(createData, createDataResult, fieldsToCheck);

    modelCRUDLHelper1.checkOperationResult(createDataResult, createData);

    const updateData = {
      ...createData,
      ...updateFieldValues,
    };
    const updateDataResult = secondClientEnabled ? await modelCRUDLHelper2.update(updateData) : await modelCRUDLHelper1.update(updateData);
    modelCRUDLHelper1.checkOperationResult(updateDataResult, updateData);

    const getDataResult = secondClientEnabled
      ? await modelCRUDLHelper2.getById(valueOrFirstValue(createData['id']))
      : await modelCRUDLHelper1.getById(valueOrFirstValue(createData['id']));
    modelCRUDLHelper1.checkOperationResult(getDataResult, updateData);

    const listDataResult = secondClientEnabled ? await modelCRUDLHelper2.list() : await modelCRUDLHelper1.list();
    modelCRUDLHelper1.checkListItemExistence(listDataResult, valueOrFirstValue(createData['id']), true);

    const deleteDataResult = secondClientEnabled
      ? await modelCRUDLHelper2.delete({ id: createData['id'] })
      : await modelCRUDLHelper1.delete({ id: createData['id'] });
    modelCRUDLHelper1.checkOperationResult(deleteDataResult, updateData);
  };

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

  public testPrivateModelAllowedFieldOperations = async (): Promise<void> => {
    const modelName = 'TodoPrivateContentVarious';
    const initialFieldsOverrides = {
      owner: this.userName1,
      privateContent: 'Private Content',
      ownerContent: 'Owner Content',
      groupContent: 'Group Content',
      authors: [this.userName1],
      customGroup: this.groupName1,
      customGroups: [this.groupName1],
    };

    const fieldsToCheck = Object.keys(initialFieldsOverrides).reduce(
      (acc, curr) => ({ [curr]: true, ...acc }),
      {} as Record<string, boolean>,
    );

    await this.testValidCRUDL(modelName, FieldMaps.TodoPrivateContentVarious, fieldsToCheck, undefined, initialFieldsOverrides, false);
  };

  // public testNonOwnerCannotPretendToBeOwner = async (): Promise<void> => {
  //   await this.testInvalidCRUDL(
  //     'TodoOwnerFieldString',
  //     FieldMaps.TodoOwnerFieldStringFieldMap,
  //     { author: true },
  //     { author: this.userName1 },
  //   );
  // };

  // public testListOwnersMemberCrudOperations = async (): Promise<void> => {
  //   await this.testValidCRUDL('TodoOwnerFieldList', FieldMaps.TodoOwnerFieldListFieldMap, {}, {}, { authors: [this.userName1] });
  // };

  // public testNonOwnerCannotAddThemselvesToList = async (): Promise<void> => {
  //   await this.testInvalidCRUDL(
  //     'TodoOwnerFieldList',
  //     FieldMaps.TodoOwnerFieldListFieldMap,
  //     {},
  //     { authors: [this.userName1, this.userName2] },
  //     { authors: [this.userName1] },
  //   );
  // };

  // public testOwnerCanAddAnotherUserToList = async (): Promise<void> => {
  //   await this.testValidCRUDL(
  //     'TodoOwnerFieldList',
  //     FieldMaps.TodoOwnerFieldListFieldMap,
  //     {},
  //     { authors: [this.userName1, this.userName2] },
  //     { authors: [this.userName1, this.userName2] },
  //     true,
  //   );
  // };

  // public testStaticGroupUserCrudOperations = async (): Promise<void> => {
  //   await this.testValidCRUDL('TodoStaticGroup', FieldMaps.TodoStaticGroupFieldMap);
  // };

  // public testNonStaticGroupUserCrudOperations = async (): Promise<void> => {
  //   await this.testInvalidCRUDL('TodoStaticGroup', FieldMaps.TodoStaticGroupFieldMap);
  // };

  // public testGroupUserCrudOperations = async (): Promise<void> => {
  //   await this.testValidCRUDL(
  //     'TodoGroupFieldString',
  //     FieldMaps.TodoGroupFieldStringFieldMap,
  //     {},
  //     { groupField: this.groupName1 },
  //     { groupField: this.groupName1 },
  //   );
  // };

  // public testUsersCannotSpoofGroupMembership = async (): Promise<void> => {
  //   await this.testInvalidCRUDL(
  //     'TodoGroupFieldString',
  //     FieldMaps.TodoGroupFieldStringFieldMap,
  //     {},
  //     { groupField: this.groupName2 },
  //     { groupField: this.groupName1 },
  //   );
  // };

  // public testListGroupUserCrudOperations = async (): Promise<void> => {
  //   await this.testValidCRUDL(
  //     'TodoGroupFieldList',
  //     FieldMaps.TodoGroupFieldListFieldMap,
  //     {},
  //     { groupsField: [this.groupName1] },
  //     { groupsField: [this.groupName1] },
  //   );
  // };

  // public testNotAllowedGroupUserCannotAccess = async (): Promise<void> => {
  //   await this.testInvalidCRUDL(
  //     'TodoGroupFieldList',
  //     FieldMaps.TodoGroupFieldListFieldMap,
  //     {},
  //     { groupsField: [this.groupName1, this.groupName2] },
  //     { groupsField: [this.groupName1] },
  //   );
  // };

  // public testAdminUserCanGiveAccessToAnotherUserGroup = async (): Promise<void> => {
  //   await this.testValidCRUDL(
  //     'TodoGroupFieldList',
  //     FieldMaps.TodoGroupFieldListFieldMap,
  //     {},
  //     { groupsField: [this.groupName1, this.groupName2] },
  //     { groupsField: [this.groupName1, this.groupName2] },
  //     true,
  //   );
  // };

  // public testLoggedInUserCustomOperations = async (): Promise<void> => {
  //   await this.testValidCustomOperations(this.appSyncClient1, 'TodoPrivate');
  // };

  // public testStaticGroupUserCustomOperations = async (): Promise<void> => {
  //   await this.testValidCustomOperations(this.appSyncClient1, 'TodoStaticGroup');
  // };

  // public testNonStaticGroupUserCustomOperations = async (): Promise<void> => {
  //   await this.testInvalidCustomOperations(this.appSyncClient2, 'TodoStaticGroup');
  // };

  // public testOwnerRileWithNullGroupsFieldAndMultipleDynamicAuth = async (): Promise<void> => {
  //   await this.testValidCRUDL(
  //     'TodoOwnerAndGroup',
  //     FieldMaps.TodoOwnerAndGroupFieldMap,
  //     {},
  //     {},
  //     {
  //       id: Date.now().toString(),
  //       content: 'Todo',
  //       groupsField: null,
  //       owners: [this.userName1],
  //     },
  //   );
  // };
}
