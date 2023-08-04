import AWSAppSyncClient from 'aws-appsync';
import { gql } from 'graphql-transformer-core';

type SelectionSet = {
  mutation: MutationSelectionSet;
  query: QueryCompleteSelectionSet;
};

type QueryCompleteSelectionSet = {
  get: string;
  list: string;
};

type MutationSelectionSet = {
  create: string;
  update: string;
  delete: string;
};

export class GQLQueryHelper {
  constructor(private client: AWSAppSyncClient<any>, private name: string, private selectionSet: SelectionSet) {}

  create = async (operation: string, input: any, selectionSet?: string): Promise<any> => {
    const finalSelectionSet = selectionSet ?? this.selectionSet.mutation.create;
    const createMutation = /* GraphQL */ `
      mutation CreateModel($input: Create${this.name}Input!, $condition: Model${this.name}ConditionInput) {
        ${operation}(input: $input, condition: $condition) {
          ${finalSelectionSet}
        }
      }
    `;
    const createInput = {
      input,
    };
    const createResult: any = await this.client.mutate({
      mutation: gql`
        ${createMutation}
      `,
      fetchPolicy: 'no-cache',
      variables: createInput,
    });

    return createResult;
  };

  update = async (operation: string, input: any, selectionSet?: string): Promise<any> => {
    const finalSelectionSet = selectionSet ?? this.selectionSet.mutation.update;
    const updateMutation = /* GraphQL */ `
      mutation UpdateModel($input: Update${this.name}Input!, $condition: Model${this.name}ConditionInput) {
        ${operation}(input: $input, condition: $condition) {
          ${finalSelectionSet}
        }
      }
    `;
    const updateInput = {
      input,
    };
    const updateResult: any = await this.client.mutate({
      mutation: gql`
        ${updateMutation}
      `,
      fetchPolicy: 'no-cache',
      variables: updateInput,
    });

    return updateResult;
  };

  delete = async (operation: string, input: any, selectionSet?: string): Promise<any> => {
    const finalSelectionSet = selectionSet ?? this.selectionSet.mutation.delete;
    const deleteMutation = /* GraphQL */ `
      mutation DeleteModel($input: Delete${this.name}Input!, $condition: Model${this.name}ConditionInput) {
        ${operation}(input: $input, condition: $condition) {
          ${finalSelectionSet}
        }
      }
    `;
    const deleteInput = {
      input,
    };
    const deleteResult: any = await this.client.mutate({
      mutation: gql`
        ${deleteMutation}
      `,
      fetchPolicy: 'no-cache',
      variables: deleteInput,
    });

    return deleteResult;
  };

  get = async (input: any, selectionSet?: string): Promise<any> => {
    const finalSelectionSet = selectionSet ?? this.selectionSet.query.get;
    const getQuery = /* GraphQL */ `
      ${finalSelectionSet}
    `;
    const getInput = {
      ...input,
    };
    const getResult: any = await this.client.query({
      query: gql`
        ${getQuery}
      `,
      fetchPolicy: 'no-cache',
      variables: getInput,
    });

    return getResult;
  };

  list = async (input?: any, selectionSet?: string): Promise<any> => {
    const finalSelectionSet = selectionSet ?? this.selectionSet.query.list;
    const listQuery = /* GraphQL */ `
      ${finalSelectionSet}
    `;
    const listInput = {
      ...input,
    };
    const listResult: any = await this.client.query({
      query: gql`
        ${listQuery}
      `,
      fetchPolicy: 'no-cache',
      variables: listInput,
    });

    return listResult;
  };
}
