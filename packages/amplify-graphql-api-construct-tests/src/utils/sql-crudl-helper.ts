import AWSAppSyncClient from 'aws-appsync';
import gql from 'graphql-tag';

/**
 * A class that attempts to handle basic/generic CRUDL operations using AppSyncClient API
 */
export class CRUDLHelper {
  constructor(
    private readonly appSyncClient: AWSAppSyncClient<any>,
    private readonly modelName: string,
    private readonly modelListName: string,
    private readonly fields: Array<string>,
  ) {}

  public create = async (args: Record<string, any>): Promise<Record<string, any>> => {
    const mutation = `
      mutation Create${this.modelName}($input: Create${this.modelName}Input!, $condition: Model${this.modelName}ConditionInput) {
        create${this.modelName}(input: $input, condition: $condition) {
          ${this.getOutputFields()}
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
          ${this.getOutputFields()}
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
          ${this.getOutputFields()}
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
          ${this.getOutputFields()}
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
          ${this.getOutputFields()}
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
            ${this.getOutputFields()}
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

  private getMutationInputs = (args: Record<string, any>): string => {
    return Object.entries(args)
      .map(([key, value]) => `${key}: "${value}"`)
      .join(', ');
  };

  private getOutputFields = (): string => {
    return `${this.fields.join('\n')}\n`;
  };

  private getQueryInputTypes = (args: Record<string, any>): string => {
    return Object.entries(args)
      .map(([key, value]) => `$${key}: ${this.getGraphQLType(value)}!`)
      .join(', ');
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
}
