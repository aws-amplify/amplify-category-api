import * as crypto from 'crypto';
import AWSAppSyncClient from 'aws-appsync';
import { gql } from 'graphql-transformer-core';

/**
 * A class that attempts to run basic operations using Appsync API.
 */
export class CRUDLTester {
  constructor(
    private readonly appsyncClient: AWSAppSyncClient<any>,
    private readonly modelName: string,
    private readonly modelListName: string,
    private readonly fields: Array<string>,
  ) {}

  /**
   * Returns id of created item.
   */
  testCanExecuteCreate = async (): Promise<string> => {
    const createResponse = (await this.appsyncClient.mutate({
      mutation: gql`
          mutation {
            create${this.modelName}(input: { ${this.getMutationInputs()} }) {
              id
            }
          }
        `,
      fetchPolicy: 'no-cache',
    })) as any;
    const id = createResponse.data[`create${this.modelName}`].id;
    expect(createResponse.data[`create${this.modelName}`].id).toBeTruthy();
    return id;
  };

  testCanExecuteCRUDLOperations = async (options?: { skipDelete: boolean }): Promise<void> => {
    const sampleItemId = await this.testCanExecuteCreate();

    const listResponse = (await this.appsyncClient.query({
      query: gql`
          query {
            list${this.modelListName} {
              items {
                id
                ${this.getOutputFields()}
              }
            }
          }
        `,
      fetchPolicy: 'no-cache',
    })) as any;
    expect(listResponse.data[`list${this.modelListName}`].items.length).toBeGreaterThan(0);

    const getResponse = (await this.appsyncClient.query({
      query: gql`
          query {
            get${this.modelName}(id: "${sampleItemId}") {
              id
              ${this.getOutputFields()}
            }
          }
        `,
      fetchPolicy: 'no-cache',
    })) as any;
    expect(getResponse.data[`get${this.modelName}`].id).toBeTruthy();
    this.fields.forEach((field) => {
      expect(getResponse.data[`get${this.modelName}`][field]).toBeTruthy();
    });

    const updateResponse = (await this.appsyncClient.mutate({
      mutation: gql`
          mutation {
            update${this.modelName}(input: { id: "${sampleItemId}", ${this.getMutationInputs()} }) {
              id
            }
          }
        `,
      fetchPolicy: 'no-cache',
    })) as any;
    expect(updateResponse.data[`update${this.modelName}`].id).toBeTruthy();

    if (!options?.skipDelete) {
      const deleteResponse = (await this.appsyncClient.mutate({
        mutation: gql`
          mutation {
            delete${this.modelName}(input: { id: "${sampleItemId}" }) {
              id
            }
          }
        `,
        fetchPolicy: 'no-cache',
      })) as any;

      expect(deleteResponse.data[`delete${this.modelName}`].id).toBeTruthy();
    }
  };

  testDoesNotHaveReadAccess = async (itemId: string): Promise<void> => {
    await expect(
      this.appsyncClient.query({
        query: gql`
          query {
            get${this.modelName}(id: "${itemId}") {
              id
              ${this.getOutputFields()}
            }
          }
        `,
        fetchPolicy: 'no-cache',
      }),
    ).rejects.toThrowError(
      /GraphQL error: Not Authorized to access .* on type|Network error: Response not successful: Received status code 401/,
    );
  };

  testDoesNotHaveCRUDLAccess = async (options?: { skipGet: boolean }): Promise<void> => {
    await expect(
      this.appsyncClient.mutate({
        mutation: gql`
          mutation {
            create${this.modelName}(input: { ${this.getMutationInputs()} }) {
              id
            }
          }
        `,
        fetchPolicy: 'no-cache',
      }),
    ).rejects.toThrowError(
      /GraphQL error: Not Authorized to access .* on type Mutation|Network error: Response not successful: Received status code 401|GraphQL error: Unauthorized on/,
    );

    await expect(
      this.appsyncClient.query({
        query: gql`
          query {
            list${this.modelListName} {
              items {
                id
                ${this.getOutputFields()}
              }
            }
          }
        `,
        fetchPolicy: 'no-cache',
      }),
    ).rejects.toThrowError(
      /GraphQL error: Not Authorized to access .* on type Query|Network error: Response not successful: Received status code 401|GraphQL error: Not Authorized to access/,
    );

    if (!options?.skipGet) {
      await this.testDoesNotHaveReadAccess('some-id');
    }

    await expect(
      this.appsyncClient.mutate({
        mutation: gql`
          mutation {
            update${this.modelName}(input: { id: "some-id", ${this.getMutationInputs()} }) {
              id
            }
          }
        `,
        fetchPolicy: 'no-cache',
      }),
    ).rejects.toThrowError(
      /GraphQL error: Not Authorized to access .* on type Mutation|Network error: Response not successful: Received status code 401|GraphQL error: Unauthorized on/,
    );

    await expect(
      this.appsyncClient.mutate({
        mutation: gql`
          mutation {
            delete${this.modelName}(input: { id: "some-id" }) {
              id
            }
          }
        `,
        fetchPolicy: 'no-cache',
      }),
    ).rejects.toThrowError(
      /GraphQL error: Not Authorized to access .* on type Mutation|Network error: Response not successful: Received status code 401/,
    );
  };

  private getMutationInputs = (): string => {
    return this.fields.map((field) => `${field}: "${crypto.randomUUID()}"`).join(', ');
  };

  private getOutputFields = (): string => {
    return `${this.fields.join('\n')}\n`;
  };
}
