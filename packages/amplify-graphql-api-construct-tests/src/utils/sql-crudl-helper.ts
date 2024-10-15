import AWSAppSyncClient from 'aws-appsync';
import gql from 'graphql-tag';

/**
 * Type that represents the GraphQL seletion set structure, used for conversion of FieldMap object to selection set string.
 *
 * Selecting scalar array:
 * - Scalar array in GraphQL custom type is same in syntax in selection set as a single scalar field.
 *
 * Selecting object/array of objects:
 * - Syntax for selecting fields is the same regardless of whether a field returns a single object or an array of objects.
 *
 * Example:
 * - selection set in object:
 *   ```typescript
 *   { id: number, name: string, tags: string[], address: { street: string, city: string } }
 *   ```
 * - in FieldMap:
 *   ```typescript
 *   { id: true, name: true, tags: true, address: { street: true, city: true } }
 *   ```
 * - in selection set syntax string:
 *   ```typescript
 *   `id
 *    name
 *    tags
 *    address {
 *      street
 *      city
 *    }`
 *   ```
 *
 * Note:
 * - If field value is an object or array of objects, define as nested object.
 * - Otherwise, use a `<[key]: true>` pair
 *
 * Future:
 * - Handle edge cases e.g. nested arrays and optional fields.
 */
export type FieldMap = {
  [key: string]: true | FieldMap;
};

/**
 * A class that attempts to handle basic/generic CRUDL operations using AppSyncClient API
 */
export class CRUDLHelper {
  constructor(
    private readonly appSyncClient: AWSAppSyncClient<any>,
    private readonly modelName?: string,
    private readonly modelListName?: string,
    private readonly fieldMap?: FieldMap,
  ) {}

  public create = async (args: Record<string, any>): Promise<Record<string, any>> => {
    const mutation = `
      mutation Create${this.modelName}($input: Create${this.modelName}Input!, $condition: Model${this.modelName}ConditionInput) {
        create${this.modelName}(input: $input, condition: $condition) {
          ${this.getOutputFields(this.fieldMap)}
        }
      }
    `;

    const createResult: any = await this.appSyncClient.mutate({
      mutation: gql(mutation),
      fetchPolicy: 'no-cache',
      variables: { input: args },
    });

    return createResult.data[`create${this.modelName}`];
  };

  public get = async (args: Record<string, any>): Promise<Record<string, any>> => {
    const query = `
      query Get${this.modelName}(${this.getQueryInputTypes(args)}) {
        get${this.modelName}(${this.getQueryInputs(args)}) {
          ${this.getOutputFields(this.fieldMap)}
        }
      }
    `;

    const getResult: any = await this.appSyncClient.query({
      query: gql(query),
      fetchPolicy: 'no-cache',
      variables: args,
    });

    return getResult.data[`get${this.modelName}`];
  };

  // If schema ID field type is "ID"
  public getById = async (id: string): Promise<Record<string, any>> => {
    const query = `
      query {
        get${this.modelName}(id: "${id}") {
          ${this.getOutputFields(this.fieldMap)}
        }
      }
    `;

    const getResult: any = await this.appSyncClient.query({
      query: gql(query),
      fetchPolicy: 'no-cache',
    });

    return getResult.data[`get${this.modelName}`];
  };

  public update = async (args: Record<string, any>): Promise<Record<string, any>> => {
    const mutation = `
      mutation Update${this.modelName}($input: Update${this.modelName}Input!, $condition: Model${this.modelName}ConditionInput) {
        update${this.modelName}(input: $input, condition: $condition) {
          ${this.getOutputFields(this.fieldMap)}
        }
      }
    `;

    const updateResult: any = await this.appSyncClient.mutate({
      mutation: gql(mutation),
      fetchPolicy: 'no-cache',
      variables: { input: args },
    });

    return updateResult.data[`update${this.modelName}`];
  };

  public delete = async (args: Record<string, any>): Promise<Record<string, any>> => {
    const mutation = `
      mutation Delete${this.modelName}($input: Delete${this.modelName}Input!, $condition: Model${this.modelName}ConditionInput) {
        delete${this.modelName}(input: $input, condition: $condition) {
          ${this.getOutputFields(this.fieldMap)}
        }
      }
    `;

    const deleteResult: any = await this.appSyncClient.mutate({
      mutation: gql(mutation),
      fetchPolicy: 'no-cache',
      variables: { input: args },
    });

    return deleteResult.data[`delete${this.modelName}`];
  };

  public list = async (limit: number = 100, nextToken: string | null = null, filter: any = null): Promise<Record<string, any>> => {
    const listQuery = `
      query List${this.modelListName}($limit: Int, $nextToken: String, $filter: Model${this.modelName}FilterInput) {
        list${this.modelListName}(limit: $limit, nextToken: $nextToken, filter: $filter) {
          items {
           ${this.getOutputFields(this.fieldMap)}
          }
          nextToken
        }
      }
    `;

    const listResult: any = await this.appSyncClient.query({
      query: gql(listQuery),
      fetchPolicy: 'no-cache',
      variables: {
        limit,
        nextToken,
        filter,
      },
    });

    return listResult.data[`list${this.modelListName}`];
  };

  public checkGenericError = (errorMessage?: string): void => {
    expect(errorMessage).toBeDefined();
    expect(errorMessage).toEqual('GraphQL error: Error processing the request. Check the logs for more details.');
  };

  private getOutputFields = (fieldMap: FieldMap, indentLevel = 1): string => {
    let output = '';
    const indent = '  '.repeat(indentLevel);

    for (const [key, value] of Object.entries(fieldMap)) {
      if (value === true) {
        output += `${indent}${key}\n`;
      } else if (typeof value === 'object') {
        output += `${indent}${key} {\n`;
        output += this.getOutputFields(value, indentLevel + 1);
        output += `${indent}}\n`;
      }
    }

    return output;
  };

  private getQueryInputs = (args: Record<string, any>): string => {
    return Object.keys(args)
      .map((key) => `${key}: $${key}`)
      .join(', ');
  };

  private getGraphQLType = (value: any): string => {
    switch (typeof value) {
      case 'number':
        return 'Int';
      case 'boolean':
        return 'Boolean';
      default:
        return 'String';
    }
  };

  private getQueryInputTypes = (args: Record<string, any>): string => {
    return Object.entries(args)
      .map(([key, value]) => `$${key}: ${this.getGraphQLType(value)}!`)
      .join(', ');
  };

  public checkOperationResult = (result: any, expected: any, isList: boolean = false, errors?: string[]): void => {
    delete result['__typename'];
    expect(result).toBeDefined();

    switch (isList) {
      case true:
        expect(result.items).toHaveLength(expected?.length);
        result?.items?.forEach((item: any, index: number) => {
          delete item['__typename'];
          expect(item).toEqual(expected[index]);
        });

        break;
      case false:
        expect(result).toEqual(expected);
        return;
      default:
    }

    if (errors && errors.length > 0) {
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(errors.length);
      errors.map((error: string) => {
        expect(result.errors).toContain(error);
      });
    }
  };

  public checkListItemExistence = (result: any, primaryKeyValue: string, shouldExist = false, primaryKeyName = 'id') => {
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(result.items?.filter((item: any) => item[primaryKeyName] === primaryKeyValue)?.length).toEqual(shouldExist ? 1 : 0);
  };

  public runCustomMutation = async (mutation: string, input: any): Promise<Record<string, any>> => {
    const customMutateResult: any = await this.appSyncClient.mutate({
      mutation: gql(mutation),
      fetchPolicy: 'no-cache',
      variables: input,
    });

    return customMutateResult.data;
  };

  public runCustomQuery = async (query: string, input: any): Promise<Record<string, any>> => {
    const customQueryResult: any = await this.appSyncClient.query({
      query: gql(query),
      fetchPolicy: 'no-cache',
      variables: input,
    });

    return customQueryResult.data;
  };
}
