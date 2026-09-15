import { LambdaClient, GetProvisionedConcurrencyConfigCommand } from '@aws-sdk/client-lambda';
import { AUTH_TYPE } from 'aws-appsync';
import { TestConfigOutput } from '../../../utils/sql-test-config-helper';
import { AppSyncClients, configureAppSyncClients } from '../../../utils/sql-appsync-client-helper';
import { CRUDLHelper } from '../../../utils/sql-crudl-helper';
import { toDoFieldMap, studentFieldMap } from './field-map';

export class ModelsTester {
  private readonly testConfigOutput: TestConfigOutput;
  private appSyncClients: AppSyncClients;

  constructor(testConfigOutput: TestConfigOutput) {
    this.testConfigOutput = testConfigOutput;
  }

  public initialize = async (): Promise<void> => {
    this.appSyncClients = await configureAppSyncClients(this.testConfigOutput);
  };

  public testCRUDLOnToDoTableWithDefaultPrimaryKey = async (): Promise<void> => {
    const toDoTableCRUDLHelper = new CRUDLHelper(
      this.appSyncClients[this.testConfigOutput.authType as AUTH_TYPE.API_KEY],
      'Todo',
      'Todos',
      toDoFieldMap,
    );

    // Create Todo Mutation
    const createTodo1 = await toDoTableCRUDLHelper.create({ description: 'Todo #1' });

    expect(createTodo1).toBeDefined();
    expect(createTodo1.id).toBeDefined();
    expect(createTodo1.description).toEqual('Todo #1');

    // Get Todo Query
    const getTodo1 = await toDoTableCRUDLHelper.getById(createTodo1.id);

    expect(getTodo1.id).toEqual(createTodo1.id);
    expect(getTodo1.description).toEqual(createTodo1.description);

    // Update Todo Mutation
    const updateTodo1 = await toDoTableCRUDLHelper.update({ id: createTodo1.id, description: 'Updated Todo #1' });

    expect(updateTodo1.id).toEqual(createTodo1.id);
    expect(updateTodo1.description).toEqual('Updated Todo #1');

    // Get Todo Query after update
    const getUpdatedTodo1 = await toDoTableCRUDLHelper.getById(createTodo1.id);

    expect(getUpdatedTodo1.id).toEqual(createTodo1.id);
    expect(getUpdatedTodo1.description).toEqual('Updated Todo #1');

    // List Todo Query
    const createTodo2 = await toDoTableCRUDLHelper.create({ description: 'Todo #2' });
    const listTodo = await toDoTableCRUDLHelper.list();

    expect(listTodo.items.length).toEqual(2);
    expect(listTodo.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: getUpdatedTodo1.id,
          description: 'Updated Todo #1',
        }),
        expect.objectContaining({
          id: createTodo2.id,
          description: 'Todo #2',
        }),
      ]),
    );

    // Delete Todo Mutation
    const deleteTodo1 = await toDoTableCRUDLHelper.delete({ id: createTodo1.id });

    expect(deleteTodo1.id).toEqual(getUpdatedTodo1.id);
    expect(deleteTodo1.description).toEqual('Updated Todo #1');

    const getDeletedTodo1 = await toDoTableCRUDLHelper.getById(createTodo1.id);

    expect(getDeletedTodo1).toBeNull();

    // List Todo Query after delete
    const listTodoAfterDelete = await toDoTableCRUDLHelper.list();

    expect(listTodoAfterDelete.items.length).toEqual(1);
    expect(listTodoAfterDelete.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createTodo2.id,
          description: 'Todo #2',
        }),
      ]),
    );

    // Check limit and nextToken
    const createTodo3 = await toDoTableCRUDLHelper.create({ description: 'Todo #3' });
    const createTodo4 = await toDoTableCRUDLHelper.create({ description: 'Todo #4' });
    const createTodo5 = await toDoTableCRUDLHelper.create({ description: 'Todo #5' });

    const listToDoWithLimit1 = await toDoTableCRUDLHelper.list(2);

    expect(listToDoWithLimit1.items.length).toEqual(2);
    expect(listToDoWithLimit1.nextToken).toBeDefined();

    const listToDoWithLimit2 = await toDoTableCRUDLHelper.list(2, listToDoWithLimit1.nextToken);

    expect(listToDoWithLimit2.items.length).toEqual(2);

    // Check filter
    const listTodosWithFilter1 = await toDoTableCRUDLHelper.list(10, null, { description: { contains: '#2' } });

    expect(listTodosWithFilter1.items.length).toEqual(1);
    expect(listTodosWithFilter1.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createTodo2.id,
          description: 'Todo #2',
        }),
      ]),
    );
    expect(listTodosWithFilter1.nextToken).toBeNull();

    const listTodosWithFilter2 = await toDoTableCRUDLHelper.list(10, null, { description: { size: { eq: 7 } } });

    expect(listTodosWithFilter2.items.length).toEqual(4);
    expect(listTodosWithFilter2.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createTodo2.id,
          description: 'Todo #2',
        }),
        expect.objectContaining({
          id: createTodo3.id,
          description: 'Todo #3',
        }),
        expect.objectContaining({
          id: createTodo4.id,
          description: 'Todo #4',
        }),
        expect.objectContaining({
          id: createTodo5.id,
          description: 'Todo #5',
        }),
      ]),
    );
    expect(listTodosWithFilter2.nextToken).toBeNull();

    // Check invalid CRUD operation returns generic error message
    const createTodo6 = await toDoTableCRUDLHelper.create({ description: 'Todo #6' });

    try {
      await toDoTableCRUDLHelper.create({ id: createTodo6.id, description: 'Todo #7' });
    } catch (error) {
      toDoTableCRUDLHelper.checkGenericError(error?.message);
    }

    const invalidId = createTodo6.id + 'x';

    try {
      await toDoTableCRUDLHelper.getById(invalidId);
    } catch (error) {
      toDoTableCRUDLHelper.checkGenericError(error?.message);
    }

    try {
      await toDoTableCRUDLHelper.update({ id: invalidId, description: 'Updated Todo #6' });
    } catch (error) {
      toDoTableCRUDLHelper.checkGenericError(error?.message);
    }

    try {
      await toDoTableCRUDLHelper.delete({ id: invalidId });
    } catch (error) {
      toDoTableCRUDLHelper.checkGenericError(error?.message);
    }
  };

  public testCRUDLOnStudentTableWithCompositePrimaryKey = async (): Promise<void> => {
    const studentTableCRUDLHelper = new CRUDLHelper(
      this.appSyncClients[this.testConfigOutput.authType as AUTH_TYPE.API_KEY],
      'Student',
      'Students',
      studentFieldMap,
    );

    // Create Student Mutation
    const createStudent1 = await studentTableCRUDLHelper.create({ studentId: 1, classId: 'A', firstName: 'John', lastName: 'Doe' });
    const createStudent2 = await studentTableCRUDLHelper.create({ studentId: 1, classId: 'B', firstName: 'Jane', lastName: 'Doe' });
    const createStudent3 = await studentTableCRUDLHelper.create({ studentId: 2, classId: 'A', firstName: 'Bob', lastName: 'Smith' });
    const createStudent4 = await studentTableCRUDLHelper.create({ studentId: 2, classId: 'B', firstName: 'Alice', lastName: 'Jones' });

    expect(createStudent1.studentId).toEqual(1);
    expect(createStudent1.classId).toEqual('A');
    expect(createStudent1.firstName).toEqual('John');
    expect(createStudent1.lastName).toEqual('Doe');

    // Get Student Query
    const getStudent1 = await studentTableCRUDLHelper.get({ studentId: 1, classId: 'A' });

    expect(getStudent1.studentId).toEqual(1);
    expect(getStudent1.classId).toEqual('A');
    expect(getStudent1.firstName).toEqual('John');
    expect(getStudent1.lastName).toEqual('Doe');

    // Update Student Query
    const updateStudent1 = await studentTableCRUDLHelper.update({ studentId: 1, classId: 'A', firstName: 'David', lastName: 'Jones' });
    const updateStudent2 = await studentTableCRUDLHelper.update({ studentId: 2, classId: 'A', firstName: 'John', lastName: 'Smith' });

    expect(updateStudent1.studentId).toEqual(1);
    expect(updateStudent1.classId).toEqual('A');
    expect(updateStudent1.firstName).toEqual('David');
    expect(updateStudent1.lastName).toEqual('Jones');

    expect(updateStudent2.studentId).toEqual(2);
    expect(updateStudent2.classId).toEqual('A');
    expect(updateStudent2.firstName).toEqual('John');
    expect(updateStudent2.lastName).toEqual('Smith');

    // Delete Student Mutation
    const deleteStudent1 = await studentTableCRUDLHelper.delete({ studentId: 1, classId: 'A' });

    expect(deleteStudent1.studentId).toEqual(1);
    expect(deleteStudent1.classId).toEqual('A');
    expect(deleteStudent1.firstName).toEqual('David');
    expect(deleteStudent1.lastName).toEqual('Jones');

    const getDeletedStudent1 = await studentTableCRUDLHelper.get({ studentId: 1, classId: 'A' });

    expect(getDeletedStudent1).toBeNull();

    // Get Student Query
    const getStudent2 = await studentTableCRUDLHelper.get({ studentId: 1, classId: 'B' });

    expect(getStudent2.studentId).toEqual(1);
    expect(getStudent2.classId).toEqual('B');
    expect(getStudent2.firstName).toEqual('Jane');
    expect(getStudent2.lastName).toEqual('Doe');

    // List Student Query
    const listStudent = await studentTableCRUDLHelper.list();

    expect(listStudent.items.length).toEqual(3);
    expect(listStudent.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId: 1,
          classId: 'B',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
        expect.objectContaining({
          studentId: 2,
          classId: 'A',
          firstName: 'John',
          lastName: 'Smith',
        }),
        expect.objectContaining({
          studentId: 2,
          classId: 'B',
          firstName: 'Alice',
          lastName: 'Jones',
        }),
      ]),
    );

    // Check limit and nextToken
    const listStudentWithLimit1 = await studentTableCRUDLHelper.list(2);

    expect(listStudentWithLimit1.items.length).toEqual(2);
    expect(listStudentWithLimit1.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId: 1,
          classId: 'B',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
        expect.objectContaining({
          studentId: 2,
          classId: 'A',
          firstName: 'John',
          lastName: 'Smith',
        }),
      ]),
    );
    expect(listStudentWithLimit1.nextToken).toBeDefined();

    const listStudentWithLimit2 = await studentTableCRUDLHelper.list(2, listStudentWithLimit1.nextToken);

    expect(listStudentWithLimit2.items.length).toEqual(1);
    expect(listStudentWithLimit2.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId: 2,
          classId: 'B',
          firstName: 'Alice',
          lastName: 'Jones',
        }),
      ]),
    );
    expect(listStudentWithLimit2.nextToken).toBeNull();

    // Check filter
    const listStudentWithFilter1 = await studentTableCRUDLHelper.list(10, null, {
      and: [{ firstName: { eq: 'John' } }, { lastName: { eq: 'Smith' } }],
    });
    expect(listStudentWithFilter1.items.length).toEqual(1);
    expect(listStudentWithFilter1.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId: 2,
          classId: 'A',
          firstName: 'John',
          lastName: 'Smith',
        }),
      ]),
    );
    expect(listStudentWithFilter1.nextToken).toBeNull();

    const listStudentWithFilter2 = await studentTableCRUDLHelper.list(10, null, { firstName: { size: { eq: 4 } } });
    expect(listStudentWithFilter2.items.length).toEqual(2);
    expect(listStudentWithFilter2.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId: 1,
          classId: 'B',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
        expect.objectContaining({
          studentId: 2,
          classId: 'A',
          firstName: 'John',
          lastName: 'Smith',
        }),
      ]),
    );
    expect(listStudentWithFilter2.nextToken).toBeNull();
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
