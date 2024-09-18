import * as path from 'path';
import { LambdaClient, GetProvisionedConcurrencyConfigCommand } from '@aws-sdk/client-lambda';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import gql from 'graphql-tag';
import { initCDKProject, cdkDeploy } from '../commands';
import { GraphqlResponse, graphql } from '../graphql-request';
import { SqlDatatabaseController } from '../sql-datatabase-controller';
import { ONE_MINUTE } from '../utils/duration-constants';

export const testGraphQLAPI = async (options: {
  projRoot: string;
  region: string;
  connectionConfigName: string;
  dbController: SqlDatatabaseController;
  resourceNames: { sqlLambdaAliasName: string };
}): Promise<void> => {
  const templatePath = path.resolve(path.join(__dirname, 'backends', 'sql-models'));
  const { projRoot, region, connectionConfigName, dbController, resourceNames } = options;
  const name = await initCDKProject(projRoot, templatePath);
  dbController.writeDbDetails(projRoot, connectionConfigName);
  const outputs = await cdkDeploy(projRoot, '--all', { postDeployWaitMs: ONE_MINUTE });
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

  // Test: check CRUDL on contact table with default primary key - postgres
  const createTodo = async (description: string, id?: string): Promise<Record<string, any>> => {
    const createMutation = /* GraphQL */ `
      mutation CreateTodo($input: CreateTodoInput!, $condition: ModelTodoConditionInput) {
        createTodo(input: $input, condition: $condition) {
          id
          description
        }
      }
    `;
    const createInput = {
      input: {
        description,
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

  const getTodo = async (id: string): Promise<Record<string, any>> => {
    const getQuery = /* GraphQL */ `
      query GetTodo($id: ID!) {
        getTodo(id: $id) {
          id
          description
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

  const updateTodo = async (id: string, description: string): Promise<Record<string, any>> => {
    const updateMutation = /* GraphQL */ `
      mutation UpdateTodo($input: UpdateTodoInput!, $condition: ModelTodoConditionInput) {
        updateTodo(input: $input, condition: $condition) {
          id
          description
        }
      }
    `;
    const updateInput = {
      input: {
        id,
        description,
      },
    };

    const updateResult: any = await appSyncClient.mutate({
      mutation: gql(updateMutation),
      fetchPolicy: 'no-cache',
      variables: updateInput,
    });

    return updateResult;
  };

  const deleteTodo = async (id: string): Promise<Record<string, any>> => {
    const deleteMutation = /* GraphQL */ `
      mutation DeleteTodo($input: DeleteTodoInput!, $condition: ModelTodoConditionInput) {
        deleteTodo(input: $input, condition: $condition) {
          id
          description
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

  const listTodo = async (limit = 100, nextToken: string | null = null, filter: any = null): Promise<Record<string, any>> => {
    const listQuery = /* GraphQL */ `
      query ListTodos($limit: Int, $nextToken: String, $filter: ModelTodoFilterInput) {
        listTodos(limit: $limit, nextToken: $nextToken, filter: $filter) {
          items {
            id
            description
          }
          nextToken
        }
      }
    `;

    const listResult: any = await appSyncClient.query({
      query: gql(listQuery),
      fetchPolicy: 'no-cache',
      variables: {
        limit,
        nextToken,
        filter,
      },
    });

    return listResult;
  };

  const checkGenericError = async (errorMessage?: string): Promise<void> => {
    expect(errorMessage).toBeDefined();
    expect(errorMessage).toEqual('GraphQL error: Error processing the request. Check the logs for more details.');
  };

  // Create Todo Mutation
  const createTodo1 = await createTodo('Todo #1');
  const createTodo2 = await createTodo('Todo #2');

  const createTodo1Result = createTodo1.data.createTodo;
  const createTodo2Result = createTodo2.data.createTodo;

  expect(createTodo1Result).toBeDefined();
  expect(createTodo1Result.id).toBeDefined();
  expect(createTodo1Result.description).toEqual('Todo #1');

  expect(createTodo2Result).toBeDefined();
  expect(createTodo2Result.id).toBeDefined();
  expect(createTodo2Result.description).toEqual('Todo #2');

  // Get Todo Query
  const getTodo1 = await getTodo(createTodo1Result.id);
  const getTodo2 = await getTodo(createTodo2Result.id);

  const getTodo1Result = getTodo1.data.getTodo;
  const getTodo2Result = getTodo2.data.getTodo;

  expect(getTodo1Result.id).toEqual(createTodo1Result.id);
  expect(getTodo1Result.description).toEqual(createTodo1Result.description);

  expect(getTodo2Result.id).toEqual(createTodo2Result.id);
  expect(getTodo2Result.description).toEqual(createTodo2Result.description);

  // Update Todo Mutation
  const updateTodo1 = await updateTodo(createTodo1Result.id, 'Updated Todo #1');
  const updateTodo2 = await updateTodo(createTodo2Result.id, 'Updated Todo #2');

  const updateTodo1Result = updateTodo1.data.updateTodo;
  const updateTodo2Result = updateTodo2.data.updateTodo;

  expect(updateTodo1Result.id).toEqual(createTodo1Result.id);
  expect(updateTodo1Result.description).toEqual('Updated Todo #1');

  expect(updateTodo2Result.id).toEqual(createTodo2Result.id);
  expect(updateTodo2Result.description).toEqual('Updated Todo #2');

  // Get Updated Todo Query
  const getUpdatedTodo1 = await getTodo(createTodo1Result.id);
  const getUpdatedTodo2 = await getTodo(createTodo2Result.id);

  const getUpdatedTodo1Result = getUpdatedTodo1.data.getTodo;
  const getUpdatedTodo2Result = getUpdatedTodo2.data.getTodo;

  expect(getUpdatedTodo1Result.id).toEqual(createTodo1Result.id);
  expect(getUpdatedTodo1Result.description).toEqual('Updated Todo #1');

  expect(getUpdatedTodo2Result.id).toEqual(createTodo2Result.id);
  expect(getUpdatedTodo2Result.description).toEqual('Updated Todo #2');

  // List Todo Query
  const listTodos = await listTodo();
  const listTodosResult = listTodos.data.listTodos;

  expect(listTodosResult.items.length).toEqual(2);
  expect(listTodosResult.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: getUpdatedTodo1Result.id,
        description: 'Updated Todo #1',
      }),
      expect.objectContaining({
        id: getUpdatedTodo2Result.id,
        description: 'Updated Todo #2',
      }),
    ]),
  );

  // Delete Todo Query
  const deleteTodo1 = await deleteTodo(createTodo1Result.id);
  const deleteTodo1Result = deleteTodo1.data.deleteTodo;

  expect(deleteTodo1Result.id).toEqual(createTodo1Result.id);
  expect(deleteTodo1Result.description).toEqual('Updated Todo #1');

  // List Todo Query
  const listTodosAfterDelete = await listTodo();
  const listTodosAfterDeleteResult = listTodosAfterDelete.data.listTodos;

  expect(listTodosAfterDeleteResult.items.length).toEqual(1);
  expect(listTodosAfterDeleteResult.items[0].id).toEqual(getUpdatedTodo2Result.id);
  expect(listTodosAfterDeleteResult.items[0].description).toEqual('Updated Todo #2');

  // Check limit and nextToken
  const createTodo3 = await createTodo('Todo #3');
  const createTodo4 = await createTodo('Todo #4');
  const createTodo5 = await createTodo('Todo #5');

  const createTodo3Result = createTodo3.data.createTodo;
  const createTodo4Result = createTodo4.data.createTodo;
  const createTodo5Result = createTodo5.data.createTodo;

  expect(createTodo3Result).toBeDefined();
  expect(createTodo3Result.id).toBeDefined();
  expect(createTodo3Result.description).toEqual('Todo #3');

  expect(createTodo4Result).toBeDefined();
  expect(createTodo4Result.id).toBeDefined();
  expect(createTodo4Result.description).toEqual('Todo #4');

  expect(createTodo5Result).toBeDefined();
  expect(createTodo5Result.id).toBeDefined();
  expect(createTodo5Result.description).toEqual('Todo #5');

  const listTodosWithLimit = await listTodo(2);
  const listTodosWithLimitResult = listTodosWithLimit.data.listTodos;
  expect(listTodosWithLimitResult.items.length).toEqual(2);
  expect(listTodosWithLimitResult.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: getUpdatedTodo2Result.id,
        description: 'Updated Todo #2',
      }),
      expect.objectContaining({
        id: createTodo3Result.id,
        description: 'Todo #3',
      }),
    ]),
  );
  expect(listTodosWithLimitResult.nextToken).toBeDefined();

  const listTodosWithNextToken = await listTodo(2, listTodosWithLimitResult.nextToken);
  const listTodosWithNextTokenResult = listTodosWithNextToken.data.listTodos;
  expect(listTodosWithNextTokenResult.items.length).toEqual(2);
  expect(listTodosWithNextTokenResult.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: createTodo4Result.id,
        description: 'Todo #4',
      }),
      expect.objectContaining({
        id: createTodo5Result.id,
        description: 'Todo #5',
      }),
    ]),
  );
  // expect(listTodosWithNextTokenResult.nextToken).toBeNull();
  console.log(listTodosWithNextTokenResult.nextToken);
  console.log(atob(listTodosWithNextTokenResult.nextToken));

  // Check and validate filter
  const listTodosWithFilter = await listTodo(10, null, { description: { contains: 'Updated' } });
  const listTodosWithFilterResult = listTodosWithFilter.data.listTodos;
  expect(listTodosWithFilterResult.items.length).toEqual(1);
  expect(listTodosWithFilterResult.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: getUpdatedTodo2Result.id,
        description: 'Updated Todo #2',
      }),
    ]),
  );
  expect(listTodosWithFilterResult.nextToken).toBeNull();

  const listTodosWithFilter2 = await listTodo(10, null, { description: { size: { eq: 7 } } });
  const listTodosWithFilter2Result = listTodosWithFilter2.data.listTodos;
  expect(listTodosWithFilter2Result.items.length).toEqual(3);
  expect(listTodosWithFilter2Result.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: createTodo3Result.id,
        description: 'Todo #3',
      }),
      expect.objectContaining({
        id: createTodo4Result.id,
        description: 'Todo #4',
      }),
      expect.objectContaining({
        id: createTodo5Result.id,
        description: 'Todo #5',
      }),
    ]),
  );
  expect(listTodosWithFilter2Result.nextToken).toBeNull();

  // Check invalid CRUD operation returns generic error message
  const createTodo6 = await createTodo('Todo #6');
  const createTodo6Result = createTodo6.data.createTodo;

  try {
    await createTodo('Todo #7', createTodo6Result.id);
  } catch (error) {
    await checkGenericError(error?.message);
  }

  const invalidId = createTodo6Result.id + 'x';

  try {
    await getTodo(invalidId);
  } catch (error) {
    await checkGenericError(error?.message);
  }

  try {
    await updateTodo(invalidId, 'Updated Todo #6');
  } catch (error) {
    await checkGenericError(error?.message);
  }

  try {
    await deleteTodo(invalidId);
  } catch (error) {
    await checkGenericError(error?.message);
  }

  // Cleanup current database for next SSM Connection test
  const deleteTodo2 = await deleteTodo(getUpdatedTodo2Result.id);
  const deleteTodo2Result = deleteTodo2.data.deleteTodo;

  expect(deleteTodo2Result.id).toEqual(getUpdatedTodo2Result.id);
  expect(deleteTodo2Result.description).toEqual('Updated Todo #2');

  const deleteTodo3 = await deleteTodo(createTodo3Result.id);
  const deleteTodo3Result = deleteTodo3.data.deleteTodo;

  expect(deleteTodo3Result.id).toEqual(createTodo3Result.id);
  expect(deleteTodo3Result.description).toEqual('Todo #3');

  const deleteTodo4 = await deleteTodo(createTodo4Result.id);
  const deleteTodo4Result = deleteTodo4.data.deleteTodo;

  expect(deleteTodo4Result.id).toEqual(createTodo4Result.id);
  expect(deleteTodo4Result.description).toEqual('Todo #4');

  const deleteTodo5 = await deleteTodo(createTodo5Result.id);
  const deleteTodo5Result = deleteTodo5.data.deleteTodo;

  expect(deleteTodo5Result.id).toEqual(createTodo5Result.id);
  expect(deleteTodo5Result.description).toEqual('Todo #5');

  const deleteTodo6 = await deleteTodo(createTodo6Result.id);
  const deleteTodo6Result = deleteTodo6.data.deleteTodo;

  expect(deleteTodo6Result.id).toEqual(createTodo6Result.id);
  expect(deleteTodo6Result.description).toEqual('Todo #6');

  console.log('Todo database cleaned up for next test');

  // Test: check CRUDL, filter, limit and nextToken on student table with composite key - postgres
  const createStudent = async (studentId: number, classId: string, firstName: string, lastName: string): Promise<Record<string, any>> => {
    const createMutation = /* GraphQL */ `
      mutation CreateStuden($input: CreateStudentInput!, $condition: ModelStudentConditionInput) {
        createStudent(input: $input, condition: $condition) {
          studentId
          classId
          firstName
          lastName
        }
      }
    `;
    const createInput = {
      input: {
        studentId,
        classId,
        firstName,
        lastName,
      },
    };
    const createResult: any = await appSyncClient.mutate({
      mutation: gql(createMutation),
      fetchPolicy: 'no-cache',
      variables: createInput,
    });

    return createResult;
  };

  const updateStudent = async (studentId: number, classId: string, firstName: string, lastName: string): Promise<Record<string, any>> => {
    const updateMutation = /* GraphQL */ `
      mutation UpdateStudent($input: UpdateStudentInput!, $condition: ModelStudentConditionInput) {
        updateStudent(input: $input, condition: $condition) {
          studentId
          classId
          firstName
          lastName
        }
      }
    `;
    const updateInput = {
      input: {
        studentId,
        classId,
        firstName,
        lastName,
      },
    };
    const updateResult: any = await appSyncClient.mutate({
      mutation: gql(updateMutation),
      fetchPolicy: 'no-cache',
      variables: updateInput,
    });

    return updateResult;
  };

  const deleteStudent = async (studentId: number, classId: string): Promise<Record<string, any>> => {
    const deleteMutation = /* GraphQL */ `
      mutation DeleteStudent($input: DeleteStudentInput!, $condition: ModelStudentConditionInput) {
        deleteStudent(input: $input, condition: $condition) {
          studentId
          classId
          firstName
          lastName
        }
      }
    `;
    const deleteInput = {
      input: {
        studentId,
        classId,
      },
    };
    const deleteResult: any = await appSyncClient.mutate({
      mutation: gql(deleteMutation),
      fetchPolicy: 'no-cache',
      variables: deleteInput,
    });

    return deleteResult;
  };

  const getStudent = async (studentId: number, classId: string): Promise<Record<string, any>> => {
    const getQuery = /* GraphQL */ `
      query GetStudent($studentId: Int!, $classId: String!) {
        getStudent(studentId: $studentId, classId: $classId) {
          studentId
          classId
          firstName
          lastName
        }
      }
    `;
    const getInput = {
      studentId,
      classId,
    };
    const getResult: any = await appSyncClient.query({
      query: gql(getQuery),
      fetchPolicy: 'no-cache',
      variables: getInput,
    });

    return getResult;
  };

  const listStudents = async (limit = 100, nextToken: string | null = null, filter: any = null): Promise<Record<string, any>> => {
    const listQuery = /* GraphQL */ `
      query ListStudents($limit: Int, $nextToken: String, $filter: ModelStudentFilterInput) {
        listStudents(limit: $limit, nextToken: $nextToken, filter: $filter) {
          items {
            studentId
            classId
            firstName
            lastName
          }
          nextToken
        }
      }
    `;
    const listResult: any = await appSyncClient.query({
      query: gql(listQuery),
      fetchPolicy: 'no-cache',
      variables: {
        limit,
        nextToken,
        filter,
      },
    });

    return listResult;
  };

  const createStudent1 = await createStudent(1, 'A', 'John', 'Doe');
  const createStudent2 = await createStudent(1, 'B', 'Jane', 'Doe');
  const createStudent3 = await createStudent(2, 'A', 'Bob', 'Smith');
  const createStudent4 = await createStudent(2, 'B', 'Alice', 'Jones');

  const createStudent1Result = createStudent1.data.createStudent;
  const createStudent2Result = createStudent2.data.createStudent;
  const createStudent3Result = createStudent3.data.createStudent;
  const createStudent4Result = createStudent4.data.createStudent;

  expect(createStudent1Result.studentId).toEqual(1);
  expect(createStudent1Result.classId).toEqual('A');
  expect(createStudent1Result.firstName).toEqual('John');
  expect(createStudent1Result.lastName).toEqual('Doe');

  expect(createStudent2Result.studentId).toEqual(1);
  expect(createStudent2Result.classId).toEqual('B');
  expect(createStudent2Result.firstName).toEqual('Jane');
  expect(createStudent2Result.lastName).toEqual('Doe');

  expect(createStudent3Result.studentId).toEqual(2);
  expect(createStudent3Result.classId).toEqual('A');
  expect(createStudent3Result.firstName).toEqual('Bob');
  expect(createStudent3Result.lastName).toEqual('Smith');

  expect(createStudent4Result.studentId).toEqual(2);
  expect(createStudent4Result.classId).toEqual('B');
  expect(createStudent4Result.firstName).toEqual('Alice');
  expect(createStudent4Result.lastName).toEqual('Jones');

  const udpateStudent1 = await updateStudent(1, 'A', 'David', 'Jones');
  const updateStudent2 = await updateStudent(2, 'A', 'John', 'Smith');

  const updateStudent1Result = udpateStudent1.data.updateStudent;
  const updateStudent2Result = updateStudent2.data.updateStudent;

  expect(updateStudent1Result.studentId).toEqual(1);
  expect(updateStudent1Result.classId).toEqual('A');
  expect(updateStudent1Result.firstName).toEqual('David');
  expect(updateStudent1Result.lastName).toEqual('Jones');

  expect(updateStudent2Result.studentId).toEqual(2);
  expect(updateStudent2Result.classId).toEqual('A');
  expect(updateStudent2Result.firstName).toEqual('John');
  expect(updateStudent2Result.lastName).toEqual('Smith');

  const deleteStudent1 = await deleteStudent(1, 'A');
  const deleteStudent1Result = deleteStudent1.data.deleteStudent;

  expect(deleteStudent1Result.studentId).toEqual(1);
  expect(deleteStudent1Result.classId).toEqual('A');
  expect(deleteStudent1Result.firstName).toEqual('David');
  expect(deleteStudent1Result.lastName).toEqual('Jones');

  const getStudent1 = await getStudent(1, 'B');
  const getStudent1Result = getStudent1.data.getStudent;

  expect(getStudent1Result.studentId).toEqual(1);
  expect(getStudent1Result.classId).toEqual('B');
  expect(getStudent1Result.firstName).toEqual('Jane');
  expect(getStudent1Result.lastName).toEqual('Doe');

  const listStudentsCurr = await listStudents();
  const listStudentsResult = listStudentsCurr.data.listStudents.items;
  expect(listStudentsResult.length).toEqual(3);
  expect(listStudentsResult).toEqual(
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

  // Validate limit and nextToken
  const listStudentsWithLimit = await listStudents(2);
  const listStudentsWithLimitResult = listStudentsWithLimit.data.listStudents.items;
  expect(listStudentsWithLimitResult.length).toEqual(2);
  expect(listStudentsWithLimitResult).toEqual(
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
  expect(listStudentsWithLimit.data.listStudents.nextToken).toBeDefined();

  const listStudentsWithLimitAndNextToken = await listStudents(2, listStudentsWithLimit.data.listStudents.nextToken);
  const listStudentsWithLimitAndNextTokenResult = listStudentsWithLimitAndNextToken.data.listStudents.items;
  expect(listStudentsWithLimitAndNextTokenResult.length).toEqual(1);
  expect(listStudentsWithLimitAndNextTokenResult).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        studentId: 2,
        classId: 'B',
        firstName: 'Alice',
        lastName: 'Jones',
      }),
    ]),
  );
  expect(listStudentsWithLimitAndNextToken.data.listStudents.nextToken).toBeNull();

  // Validate filter
  const listStudentsWithFilter1 = await listStudents(10, null, {
    and: [{ firstName: { eq: 'John' } }, { lastName: { eq: 'Smith' } }],
  });
  const listStudentsWithFilter1Result = listStudentsWithFilter1.data.listStudents.items;
  expect(listStudentsWithFilter1Result.length).toEqual(1);
  expect(listStudentsWithFilter1Result).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        studentId: 2,
        classId: 'A',
        firstName: 'John',
        lastName: 'Smith',
      }),
    ]),
  );
  expect(listStudentsWithFilter1.data.listStudents.nextToken).toBeNull();

  const listStudentsWithFilter2 = await listStudents(10, null, { firstName: { size: { eq: 4 } } });
  const listStudentsWithFilter2Result = listStudentsWithFilter2.data.listStudents.items;
  expect(listStudentsWithFilter2Result.length).toEqual(2);
  expect(listStudentsWithFilter2Result).toEqual(
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
  expect(listStudentsWithFilter2.data.listStudents.nextToken).toBeNull();

  // Cleanup current database for next SSM Connection test
  const deleteStudent2 = await deleteStudent(1, 'B');
  const deleteStudent2Result = deleteStudent2.data.deleteStudent;

  expect(deleteStudent2Result.studentId).toEqual(1);
  expect(deleteStudent2Result.classId).toEqual('B');
  expect(deleteStudent2Result.firstName).toEqual('Jane');
  expect(deleteStudent2Result.lastName).toEqual('Doe');

  const deleteStudent3 = await deleteStudent(2, 'A');
  const deleteStudent3Result = deleteStudent3.data.deleteStudent;

  expect(deleteStudent3Result.studentId).toEqual(2);
  expect(deleteStudent3Result.classId).toEqual('A');
  expect(deleteStudent3Result.firstName).toEqual('John');
  expect(deleteStudent3Result.lastName).toEqual('Smith');

  const deleteStudent4 = await deleteStudent(2, 'B');
  const deleteStudent4Result = deleteStudent4.data.deleteStudent;

  expect(deleteStudent4Result.studentId).toEqual(2);
  expect(deleteStudent4Result.classId).toEqual('B');
  expect(deleteStudent4Result.firstName).toEqual('Alice');
  expect(deleteStudent4Result.lastName).toEqual('Jones');

  console.log('Student database cleaned up for next test');

  // Check SQL Lambda provisioned concurrency
  const client = new LambdaClient({ region });
  const functionName = outputs[name].SQLFunctionName;
  const command = new GetProvisionedConcurrencyConfigCommand({
    FunctionName: functionName,
    Qualifier: resourceNames.sqlLambdaAliasName,
  });
  const response = await client.send(command);
  expect(response.RequestedProvisionedConcurrentExecutions).toEqual(2);
};
