import AWSAppSyncClient from 'aws-appsync';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import { configureAppSyncClients, CRUDLHelper, FieldMap, getUserMap, TestConfigOutput, valueOrFirstValue } from '../../../utils';

/**
 * A base class that initializes users, groups, and AppSync clients for use in dynamic auth tests
 */
export class UserBasedClientTesterBase {
  protected readonly testConfigOutput: TestConfigOutput;

  protected appSyncClient1: AWSAppSyncClient<NormalizedCacheObject>;
  protected appSyncClient2: AWSAppSyncClient<NormalizedCacheObject>;

  protected userName1: string;
  protected userName2: string;
  protected groupName1: string;
  protected groupName2: string;

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

  /**
   * Validates that `id` and all fields in `fields` are defined
   */
  protected checkCreateData = (createDataResult: Record<string, any>, fields: Record<string, boolean>): void => {
    expect(createDataResult.id).toBeDefined();

    Object.keys(fields).forEach((fieldName) => {
      if (fields[fieldName]) {
        expect(createDataResult[fieldName]).toBeDefined();
      }
    });
  };

  /**
   * Merges fields of `createDataResult` that are present in `fields` into `createData`. Mutates `createData`.
   */
  protected completeCreateData = (
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

  protected testValidCRUDL = async (
    modelName: string,
    fieldMap: FieldMap,
    initializeFields: Record<string, boolean> = {},
    testFieldsOverrides: Record<string, string | string[]> = {},
    initialFieldsOverrides: Record<string, string | string[]> = {},
    secondClientEnabled = false,
  ): Promise<void> => {
    const modelCRUDLHelper1 = new CRUDLHelper(this.appSyncClient1, modelName, `${modelName}s`, fieldMap);
    const modelCRUDLHelper2 = new CRUDLHelper(this.appSyncClient2, modelName, `${modelName}s`, fieldMap);

    const createData: Record<string, string | string[]> = {
      ...initialFieldsOverrides,
    };

    if (typeof fieldMap['content'] !== 'undefined') {
      createData['content'] = 'Todo';
    }

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

  protected testInvalidCRUDL = async (
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
}
