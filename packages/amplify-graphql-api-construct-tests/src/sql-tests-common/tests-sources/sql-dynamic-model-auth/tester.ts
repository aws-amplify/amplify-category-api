import AWSAppSyncClient from 'aws-appsync';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { TestConfigOutput } from '../../../utils/sql-test-config-helper';
import { configureAppSyncClients } from '../../../utils/sql-appsync-client-helper';
import { getUserMap } from '../../../utils/sql-cognito-helper';
import { CRUDLHelper, FieldMap } from '../../../utils/sql-crudl-helper';
import * as FieldMaps from './field-map';

export class DynamicModelAuthTester {
  private readonly testConfigOutput: TestConfigOutput;

  private appSyncClient1: AWSAppSyncClient<NormalizedCacheObject>;
  private appSyncClient2: AWSAppSyncClient<NormalizedCacheObject>;

  private userName1: string;
  private userName2: string;
  private groupName1: string;
  private groupName2: string;

  constructor(testConfigOutput: TestConfigOutput) {
    this.testConfigOutput = testConfigOutput;
  }

  public initialize = async (): Promise<void> => {
    const userMap = await getUserMap(this.testConfigOutput);
    const appSyncClients = await configureAppSyncClients(this.testConfigOutput, userMap);

    this.userName1 = Object.keys(userMap)[0];
    this.userName2 = Object.keys(userMap)[1];
    this.groupName1 = this.testConfigOutput.userGroups[0];
    this.groupName2 = this.testConfigOutput.userGroups[1];

    this.appSyncClient1 = appSyncClients[this.testConfigOutput.authType][this.userName1];
    this.appSyncClient2 = appSyncClients[this.testConfigOutput.authType][this.userName2];
  };

  private checkCreateData = (createDataResult: Record<string, any>, fields: Record<string, boolean>): void => {
    expect(createDataResult.id).toBeDefined();

    Object.keys(fields).forEach((fieldName) => {
      if (fields[fieldName]) {
        expect(createDataResult[fieldName]).toBeDefined();
      }
    });
  };

  private completeCreateData = (
    createData: Record<string, any>,
    createDataResult: Record<string, any>,
    fields: Record<string, boolean>,
  ): Record<string, any> => {
    createData['id'] = createDataResult.id;

    Object.keys(fields).forEach((fieldName) => {
      if (fields[fieldName]) {
        createData[fieldName] = createDataResult[fieldName];
      }
    });

    return createData;
  };

  private testValidCRUDL = async (
    modelName: string,
    fieldMap: FieldMap,
    initializeFields: Record<string, boolean> = {},
    testFieldsOverrides: Record<string, string | string[]> = {},
    initialFieldsOverrides: Record<string, string | string[]> = {},
    secondClientEnabled: boolean = false,
  ): Promise<void> => {
    const modelCRUDLHelper1 = new CRUDLHelper(this.appSyncClient1, modelName, `${modelName}s`, fieldMap);
    const modelCRUDLHelper2 = new CRUDLHelper(this.appSyncClient2, modelName, `${modelName}s`, fieldMap);

    const createData = {
      ...initialFieldsOverrides,
      content: 'Todo',
    };
    const createDataResult = await modelCRUDLHelper1.create(createData);

    this.checkCreateData(createDataResult, initializeFields);
    this.completeCreateData(createData, createDataResult, initializeFields);

    modelCRUDLHelper1.checkOperationResult(createDataResult, createData);

    const updateData = {
      ...createData,
      ...testFieldsOverrides,
      content: 'Todo updated',
    };
    const updateDataResult = secondClientEnabled ? await modelCRUDLHelper2.update(updateData) : await modelCRUDLHelper1.update(updateData);
    modelCRUDLHelper1.checkOperationResult(updateDataResult, updateData);

    const getDataResult = secondClientEnabled
      ? await modelCRUDLHelper2.getById(createData['id'])
      : await modelCRUDLHelper1.getById(createData['id']);
    modelCRUDLHelper1.checkOperationResult(getDataResult, updateData);

    const listDataResult = secondClientEnabled ? await modelCRUDLHelper2.list() : await modelCRUDLHelper1.list();
    modelCRUDLHelper1.checkListItemExistence(listDataResult, createData['id'], true);

    const deleteDataResult = secondClientEnabled
      ? await modelCRUDLHelper2.delete({ id: createData['id'] })
      : await modelCRUDLHelper1.delete({ id: createData['id'] });
    modelCRUDLHelper1.checkOperationResult(deleteDataResult, updateData);
  };

  private testInvalidCRUDL = async (
    modelName: string,
    fieldMap: FieldMap,
    initializeFields: Record<string, boolean> = {},
    testFieldsOverrides: Record<string, string | string[]> = {},
    initialFieldsOverrides: Record<string, string | string[]> = {},
  ): Promise<void> => {
    const modelCRUDLHelper1 = new CRUDLHelper(this.appSyncClient1, modelName, `${modelName}s`, fieldMap);
    const modelCRUDLHelper2 = new CRUDLHelper(this.appSyncClient2, modelName, `${modelName}s`, fieldMap);

    const createData = {
      ...initialFieldsOverrides,
      content: 'Todo',
    };
    const createDataResult = await modelCRUDLHelper1.create(createData);

    this.checkCreateData(createDataResult, initializeFields);
    this.completeCreateData(createData, createDataResult, initializeFields);

    modelCRUDLHelper1.checkOperationResult(createDataResult, createData);

    await expect(modelCRUDLHelper2.create(createData)).rejects.toThrow(
      `GraphQL error: Not Authorized to access create${modelName} on type Mutation`,
    );

    const updateData = {
      ...createData,
      ...testFieldsOverrides,
      content: 'Todo updated',
    };
    await expect(modelCRUDLHelper2.update(updateData)).rejects.toThrow(
      `GraphQL error: Not Authorized to access update${modelName} on type Mutation`,
    );

    await expect(async () => {
      await modelCRUDLHelper2.getById(createData['id']);
    }).rejects.toThrowErrorMatchingInlineSnapshot(`"GraphQL error: Not Authorized to access get${modelName} on type Query"`);

    try {
      const listDataResult = await modelCRUDLHelper2.list();
      modelCRUDLHelper2.checkListItemExistence(listDataResult, createData['id']);
    } catch (error) {
      expect(error.message.includes(`GraphQL error: Not Authorized to access list${modelName}s on type Query`)).toBeTruthy();
    }

    await expect(
      modelCRUDLHelper2.delete({
        id: createData['id'],
      }),
    ).rejects.toThrow(`GraphQL error: Not Authorized to access delete${modelName} on type Mutation`);
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
    const createResult = await customCRUDLHelper.runCustomMutate(createMutation, createData);
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
    await expect(customCRUDLHelper.runCustomMutate(createMutation, createData)).rejects.toThrow(
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
