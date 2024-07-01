/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from './API';
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getPrimary = /* GraphQL */ `query GetPrimary($id: ID!) {
  getPrimary(id: $id) {
    id
    relatedMany {
      nextToken
      items {
        id
        primaryId
      }
    }
    relatedOne {
      id
      primaryId
    }
  }
}
` as GeneratedQuery<APITypes.GetPrimaryQueryVariables, APITypes.GetPrimaryQuery>;
export const getRelatedMany = /* GraphQL */ `query GetRelatedMany($id: ID!) {
  getRelatedMany(id: $id) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedQuery<APITypes.GetRelatedManyQueryVariables, APITypes.GetRelatedManyQuery>;
export const getRelatedOne = /* GraphQL */ `query GetRelatedOne($id: ID!) {
  getRelatedOne(id: $id) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedQuery<APITypes.GetRelatedOneQueryVariables, APITypes.GetRelatedOneQuery>;
export const listPrimaries = /* GraphQL */ `query ListPrimaries(
  $filter: ModelPrimaryFilterInput
  $id: ID
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listPrimaries(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      id
    }
    nextToken
  }
}
` as GeneratedQuery<APITypes.ListPrimariesQueryVariables, APITypes.ListPrimariesQuery>;
export const listRelatedManies = /* GraphQL */ `query ListRelatedManies(
  $filter: ModelRelatedManyFilterInput
  $id: ID
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedManies(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      id
      primaryId
    }
    nextToken
  }
}
` as GeneratedQuery<APITypes.ListRelatedManiesQueryVariables, APITypes.ListRelatedManiesQuery>;
export const listRelatedOnes = /* GraphQL */ `query ListRelatedOnes(
  $filter: ModelRelatedOneFilterInput
  $id: ID
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedOnes(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      id
      primaryId
    }
    nextToken
  }
}
` as GeneratedQuery<APITypes.ListRelatedOnesQueryVariables, APITypes.ListRelatedOnesQuery>;
