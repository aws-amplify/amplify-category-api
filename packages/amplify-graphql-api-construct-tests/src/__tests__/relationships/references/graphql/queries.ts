/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getPrimary = /* GraphQL */ `query GetPrimary($id: ID!) {
  getPrimary(id: $id) {
    createdAt
    id
    relatedMany {
      nextToken
      __typename
    }
    relatedOne {
      createdAt
      id
      primaryId
      updatedAt
      __typename
    }
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetPrimaryQueryVariables,
  APITypes.GetPrimaryQuery
>;
export const getPrimaryCPKSKOne = /* GraphQL */ `query GetPrimaryCPKSKOne($id: ID!, $skOne: ID!) {
  getPrimaryCPKSKOne(id: $id, skOne: $skOne) {
    createdAt
    id
    relatedMany {
      nextToken
      __typename
    }
    relatedOne {
      createdAt
      id
      primaryId
      primarySkOne
      updatedAt
      __typename
    }
    skOne
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetPrimaryCPKSKOneQueryVariables,
  APITypes.GetPrimaryCPKSKOneQuery
>;
export const getPrimaryCPKSKTwo = /* GraphQL */ `query GetPrimaryCPKSKTwo($id: ID!, $skOne: ID!, $skTwo: ID!) {
  getPrimaryCPKSKTwo(id: $id, skOne: $skOne, skTwo: $skTwo) {
    createdAt
    id
    relatedMany {
      nextToken
      __typename
    }
    relatedOne {
      createdAt
      id
      primaryId
      primarySkOne
      primarySkTwo
      updatedAt
      __typename
    }
    skOne
    skTwo
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetPrimaryCPKSKTwoQueryVariables,
  APITypes.GetPrimaryCPKSKTwoQuery
>;
export const getRelatedMany = /* GraphQL */ `query GetRelatedMany($id: ID!) {
  getRelatedMany(id: $id) {
    createdAt
    id
    primary {
      createdAt
      id
      updatedAt
      __typename
    }
    primaryId
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetRelatedManyQueryVariables,
  APITypes.GetRelatedManyQuery
>;
export const getRelatedManyCPKSKOne = /* GraphQL */ `query GetRelatedManyCPKSKOne($id: String!) {
  getRelatedManyCPKSKOne(id: $id) {
    createdAt
    id
    primary {
      createdAt
      id
      skOne
      updatedAt
      __typename
    }
    primaryId
    primarySkOne
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetRelatedManyCPKSKOneQueryVariables,
  APITypes.GetRelatedManyCPKSKOneQuery
>;
export const getRelatedManyCPKSKTwo = /* GraphQL */ `query GetRelatedManyCPKSKTwo($id: String!) {
  getRelatedManyCPKSKTwo(id: $id) {
    createdAt
    id
    primary {
      createdAt
      id
      skOne
      skTwo
      updatedAt
      __typename
    }
    primaryId
    primarySkOne
    primarySkTwo
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetRelatedManyCPKSKTwoQueryVariables,
  APITypes.GetRelatedManyCPKSKTwoQuery
>;
export const getRelatedOne = /* GraphQL */ `query GetRelatedOne($id: ID!) {
  getRelatedOne(id: $id) {
    createdAt
    id
    primary {
      createdAt
      id
      updatedAt
      __typename
    }
    primaryId
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetRelatedOneQueryVariables,
  APITypes.GetRelatedOneQuery
>;
export const getRelatedOneCPKSKOne = /* GraphQL */ `query GetRelatedOneCPKSKOne($id: String!) {
  getRelatedOneCPKSKOne(id: $id) {
    createdAt
    id
    primary {
      createdAt
      id
      skOne
      updatedAt
      __typename
    }
    primaryId
    primarySkOne
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetRelatedOneCPKSKOneQueryVariables,
  APITypes.GetRelatedOneCPKSKOneQuery
>;
export const getRelatedOneCPKSKTwo = /* GraphQL */ `query GetRelatedOneCPKSKTwo($id: String!) {
  getRelatedOneCPKSKTwo(id: $id) {
    createdAt
    id
    primary {
      createdAt
      id
      skOne
      skTwo
      updatedAt
      __typename
    }
    primaryId
    primarySkOne
    primarySkTwo
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetRelatedOneCPKSKTwoQueryVariables,
  APITypes.GetRelatedOneCPKSKTwoQuery
>;
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
      createdAt
      id
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListPrimariesQueryVariables,
  APITypes.ListPrimariesQuery
>;
export const listPrimaryCPKSKOnes = /* GraphQL */ `query ListPrimaryCPKSKOnes(
  $filter: ModelPrimaryCPKSKOneFilterInput
  $id: ID
  $limit: Int
  $nextToken: String
  $skOne: ModelIDKeyConditionInput
  $sortDirection: ModelSortDirection
) {
  listPrimaryCPKSKOnes(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    skOne: $skOne
    sortDirection: $sortDirection
  ) {
    items {
      createdAt
      id
      skOne
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListPrimaryCPKSKOnesQueryVariables,
  APITypes.ListPrimaryCPKSKOnesQuery
>;
export const listPrimaryCPKSKTwos = /* GraphQL */ `query ListPrimaryCPKSKTwos(
  $filter: ModelPrimaryCPKSKTwoFilterInput
  $id: ID
  $limit: Int
  $nextToken: String
  $skOneSkTwo: ModelPrimaryCPKSKTwoPrimaryCompositeKeyConditionInput
  $sortDirection: ModelSortDirection
) {
  listPrimaryCPKSKTwos(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    skOneSkTwo: $skOneSkTwo
    sortDirection: $sortDirection
  ) {
    items {
      createdAt
      id
      skOne
      skTwo
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListPrimaryCPKSKTwosQueryVariables,
  APITypes.ListPrimaryCPKSKTwosQuery
>;
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
      createdAt
      id
      primaryId
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListRelatedManiesQueryVariables,
  APITypes.ListRelatedManiesQuery
>;
export const listRelatedManyCPKSKOnes = /* GraphQL */ `query ListRelatedManyCPKSKOnes(
  $filter: ModelRelatedManyCPKSKOneFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedManyCPKSKOnes(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      createdAt
      id
      primaryId
      primarySkOne
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListRelatedManyCPKSKOnesQueryVariables,
  APITypes.ListRelatedManyCPKSKOnesQuery
>;
export const listRelatedManyCPKSKTwos = /* GraphQL */ `query ListRelatedManyCPKSKTwos(
  $filter: ModelRelatedManyCPKSKTwoFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedManyCPKSKTwos(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      createdAt
      id
      primaryId
      primarySkOne
      primarySkTwo
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListRelatedManyCPKSKTwosQueryVariables,
  APITypes.ListRelatedManyCPKSKTwosQuery
>;
export const listRelatedOneCPKSKOnes = /* GraphQL */ `query ListRelatedOneCPKSKOnes(
  $filter: ModelRelatedOneCPKSKOneFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedOneCPKSKOnes(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      createdAt
      id
      primaryId
      primarySkOne
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListRelatedOneCPKSKOnesQueryVariables,
  APITypes.ListRelatedOneCPKSKOnesQuery
>;
export const listRelatedOneCPKSKTwos = /* GraphQL */ `query ListRelatedOneCPKSKTwos(
  $filter: ModelRelatedOneCPKSKTwoFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedOneCPKSKTwos(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      createdAt
      id
      primaryId
      primarySkOne
      primarySkTwo
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListRelatedOneCPKSKTwosQueryVariables,
  APITypes.ListRelatedOneCPKSKTwosQuery
>;
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
      createdAt
      id
      primaryId
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListRelatedOnesQueryVariables,
  APITypes.ListRelatedOnesQuery
>;
