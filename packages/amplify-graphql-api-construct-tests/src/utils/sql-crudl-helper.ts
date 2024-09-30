import AWSAppSyncClient from 'aws-appsync';
import gql from 'graphql-tag';

/**
 * Type that represents the GraphQL field selection string structure
 * GraphQL does not diffrentiate between return single object or array of primitives/objects
 * If field value is an object or array of objects, define as nested object, otherwise <[key]: true> pair
 * Future: handle edge cases e.g. nested arrays and optional fields
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
    private readonly modelName: string,
    private readonly modelListName: string,
    private readonly fieldMap: FieldMap,
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
}
