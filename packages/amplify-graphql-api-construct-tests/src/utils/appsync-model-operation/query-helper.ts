import AWSAppSyncClient from 'aws-appsync';
import { gql } from 'graphql-transformer-core';

type SelectionSet = {
  mutation: MutationSelectionSet;
  query: QueryCompleteSelectionSet;
  subscription?: SubscriptionCompleteSelectionSet;
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

type SubscriptionCompleteSelectionSet = {
  onCreate: string;
  onUpdate: string;
  onDelete: string;
};

type ErrorPolicy = 'none' | 'ignore' | 'all';

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
    console.log('Create mutation:', createMutation);
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

  get = async (
    input: any,
    selectionSet?: string,
    isCompleteQuery = true,
    errorPolicy: ErrorPolicy = 'none',
    primaryKeyName = 'id',
  ): Promise<any> => {
    let completeSelectionSet = selectionSet;
    if (selectionSet && !isCompleteQuery) {
      completeSelectionSet = `
        query GetModel($${primaryKeyName}: ID!) {
          get${this.name}(${primaryKeyName}: $${primaryKeyName}) {
            ${selectionSet}
          }
        }
      `;
    }
    const finalSelectionSet = completeSelectionSet ?? this.selectionSet.query.get;
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
      errorPolicy,
    });

    return getResult;
  };

  list = async (
    input?: any,
    selectionSet?: string,
    operation?: string,
    isCompleteQuery = true,
    errorPolicy: ErrorPolicy = 'none',
  ): Promise<any> => {
    let completeSelectionSet = selectionSet;
    if (selectionSet && !isCompleteQuery) {
      completeSelectionSet = `
        query ListModels {
          ${operation || `list${this.name}s`} {
            items {
              ${selectionSet}
            }
          }
        }
      `;
    }
    const finalSelectionSet = completeSelectionSet ?? this.selectionSet.query.list;
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
      errorPolicy,
    });

    return listResult;
  };

  subscribe = async (
    operation: string,
    mutationsToSubscribe: (() => Promise<any>)[],
    input?: any,
    selectionSet?: string,
    isCompleteSelectionSet = true,
  ): Promise<any> => {
    let completeSelectionSet = selectionSet;
    if (selectionSet && !isCompleteSelectionSet) {
      completeSelectionSet = `
        subscription ModelSubscription {
          ${operation}${this.name} {
            ${selectionSet}
          }
        }
      `;
    }
    const finalSelectionSet = completeSelectionSet ?? this.selectionSet.subscription[operation];
    const subscriptionOperation = /* GraphQL */ `
      ${finalSelectionSet}
    `;
    const subscriptionInput = {
      ...input,
    };
    const subscriptionResult = [];

    console.log('Subscription operation:', subscriptionOperation);
    const observer = this.client.subscribe({
      query: gql`
        ${subscriptionOperation}
      `,
      variables: subscriptionInput,
      fetchPolicy: 'no-cache',
    });

    const subscription = observer.subscribe({
      next: (result: any) => {
        console.log('Received subscription data:', result);
        subscriptionResult.push(result);
      },
      error: (errorValue: any) => {
        console.error('Error in subscription:', errorValue);
        throw new Error(errorValue);
      },
    });

    await new Promise<void>((res) => setTimeout(() => res(), 4000));
    for (const mutation of mutationsToSubscribe) {
      await mutation();
      await new Promise<void>((res) => setTimeout(() => res(), 4000)); // ensure correct order in received data
    }

    await new Promise<void>((res) => setTimeout(() => res(), 4000));
    subscription.unsubscribe();
    return subscriptionResult;
  };
}

export const runQuery = async (client: AWSAppSyncClient<any>, query: string, variables: any): Promise<any> => {
  const result = await client.query({
    query: gql`
      ${query}
    `,
    variables,
    fetchPolicy: 'no-cache',
  });
  return result;
};
