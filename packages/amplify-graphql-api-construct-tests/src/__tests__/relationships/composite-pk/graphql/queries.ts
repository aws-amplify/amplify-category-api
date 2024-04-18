/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from '../API';
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getPrimaryCPKSKFour = /* GraphQL */ `query GetPrimaryCPKSKFour(
  $id: ID!
  $skFour: ID!
  $skOne: ID!
  $skThree: ID!
  $skTwo: ID!
) {
  getPrimaryCPKSKFour(
    id: $id
    skFour: $skFour
    skOne: $skOne
    skThree: $skThree
    skTwo: $skTwo
  ) {
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
      primarySkFour
      primarySkOne
      primarySkThree
      primarySkTwo
      updatedAt
      __typename
    }
    skFour
    skOne
    skThree
    skTwo
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetPrimaryCPKSKFourQueryVariables, APITypes.GetPrimaryCPKSKFourQuery>;
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
` as GeneratedQuery<APITypes.GetPrimaryCPKSKOneQueryVariables, APITypes.GetPrimaryCPKSKOneQuery>;
export const getPrimaryCPKSKThree = /* GraphQL */ `query GetPrimaryCPKSKThree($id: ID!, $skOne: ID!, $skThree: ID!, $skTwo: ID!) {
  getPrimaryCPKSKThree(
    id: $id
    skOne: $skOne
    skThree: $skThree
    skTwo: $skTwo
  ) {
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
      primarySkThree
      primarySkTwo
      updatedAt
      __typename
    }
    skOne
    skThree
    skTwo
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetPrimaryCPKSKThreeQueryVariables, APITypes.GetPrimaryCPKSKThreeQuery>;
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
` as GeneratedQuery<APITypes.GetPrimaryCPKSKTwoQueryVariables, APITypes.GetPrimaryCPKSKTwoQuery>;
export const getRelatedManyCPKSKFour = /* GraphQL */ `query GetRelatedManyCPKSKFour($id: String!) {
  getRelatedManyCPKSKFour(id: $id) {
    createdAt
    id
    primary {
      createdAt
      id
      skFour
      skOne
      skThree
      skTwo
      updatedAt
      __typename
    }
    primaryId
    primarySkFour
    primarySkOne
    primarySkThree
    primarySkTwo
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetRelatedManyCPKSKFourQueryVariables, APITypes.GetRelatedManyCPKSKFourQuery>;
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
` as GeneratedQuery<APITypes.GetRelatedManyCPKSKOneQueryVariables, APITypes.GetRelatedManyCPKSKOneQuery>;
export const getRelatedManyCPKSKThree = /* GraphQL */ `query GetRelatedManyCPKSKThree($id: String!) {
  getRelatedManyCPKSKThree(id: $id) {
    createdAt
    id
    primary {
      createdAt
      id
      skOne
      skThree
      skTwo
      updatedAt
      __typename
    }
    primaryId
    primarySkOne
    primarySkThree
    primarySkTwo
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetRelatedManyCPKSKThreeQueryVariables, APITypes.GetRelatedManyCPKSKThreeQuery>;
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
` as GeneratedQuery<APITypes.GetRelatedManyCPKSKTwoQueryVariables, APITypes.GetRelatedManyCPKSKTwoQuery>;
export const getRelatedOneCPKSKFour = /* GraphQL */ `query GetRelatedOneCPKSKFour($id: String!) {
  getRelatedOneCPKSKFour(id: $id) {
    createdAt
    id
    primary {
      createdAt
      id
      skFour
      skOne
      skThree
      skTwo
      updatedAt
      __typename
    }
    primaryId
    primarySkFour
    primarySkOne
    primarySkThree
    primarySkTwo
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetRelatedOneCPKSKFourQueryVariables, APITypes.GetRelatedOneCPKSKFourQuery>;
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
` as GeneratedQuery<APITypes.GetRelatedOneCPKSKOneQueryVariables, APITypes.GetRelatedOneCPKSKOneQuery>;
export const getRelatedOneCPKSKThree = /* GraphQL */ `query GetRelatedOneCPKSKThree($id: String!) {
  getRelatedOneCPKSKThree(id: $id) {
    createdAt
    id
    primary {
      createdAt
      id
      skOne
      skThree
      skTwo
      updatedAt
      __typename
    }
    primaryId
    primarySkOne
    primarySkThree
    primarySkTwo
    updatedAt
    __typename
  }
}
` as GeneratedQuery<APITypes.GetRelatedOneCPKSKThreeQueryVariables, APITypes.GetRelatedOneCPKSKThreeQuery>;
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
` as GeneratedQuery<APITypes.GetRelatedOneCPKSKTwoQueryVariables, APITypes.GetRelatedOneCPKSKTwoQuery>;
export const listPrimaryCPKSKFours = /* GraphQL */ `query ListPrimaryCPKSKFours(
  $filter: ModelPrimaryCPKSKFourFilterInput
  $id: ID
  $limit: Int
  $nextToken: String
  $skOneSkTwoSkThreeSkFour: ModelPrimaryCPKSKFourPrimaryCompositeKeyConditionInput
  $sortDirection: ModelSortDirection
) {
  listPrimaryCPKSKFours(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    skOneSkTwoSkThreeSkFour: $skOneSkTwoSkThreeSkFour
    sortDirection: $sortDirection
  ) {
    items {
      createdAt
      id
      skFour
      skOne
      skThree
      skTwo
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListPrimaryCPKSKFoursQueryVariables, APITypes.ListPrimaryCPKSKFoursQuery>;
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
` as GeneratedQuery<APITypes.ListPrimaryCPKSKOnesQueryVariables, APITypes.ListPrimaryCPKSKOnesQuery>;
export const listPrimaryCPKSKThrees = /* GraphQL */ `query ListPrimaryCPKSKThrees(
  $filter: ModelPrimaryCPKSKThreeFilterInput
  $id: ID
  $limit: Int
  $nextToken: String
  $skOneSkTwoSkThree: ModelPrimaryCPKSKThreePrimaryCompositeKeyConditionInput
  $sortDirection: ModelSortDirection
) {
  listPrimaryCPKSKThrees(
    filter: $filter
    id: $id
    limit: $limit
    nextToken: $nextToken
    skOneSkTwoSkThree: $skOneSkTwoSkThree
    sortDirection: $sortDirection
  ) {
    items {
      createdAt
      id
      skOne
      skThree
      skTwo
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListPrimaryCPKSKThreesQueryVariables, APITypes.ListPrimaryCPKSKThreesQuery>;
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
` as GeneratedQuery<APITypes.ListPrimaryCPKSKTwosQueryVariables, APITypes.ListPrimaryCPKSKTwosQuery>;
export const listRelatedManyCPKSKFours = /* GraphQL */ `query ListRelatedManyCPKSKFours(
  $filter: ModelRelatedManyCPKSKFourFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedManyCPKSKFours(
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
      primarySkFour
      primarySkOne
      primarySkThree
      primarySkTwo
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListRelatedManyCPKSKFoursQueryVariables, APITypes.ListRelatedManyCPKSKFoursQuery>;
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
` as GeneratedQuery<APITypes.ListRelatedManyCPKSKOnesQueryVariables, APITypes.ListRelatedManyCPKSKOnesQuery>;
export const listRelatedManyCPKSKThrees = /* GraphQL */ `query ListRelatedManyCPKSKThrees(
  $filter: ModelRelatedManyCPKSKThreeFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedManyCPKSKThrees(
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
      primarySkThree
      primarySkTwo
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListRelatedManyCPKSKThreesQueryVariables, APITypes.ListRelatedManyCPKSKThreesQuery>;
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
` as GeneratedQuery<APITypes.ListRelatedManyCPKSKTwosQueryVariables, APITypes.ListRelatedManyCPKSKTwosQuery>;
export const listRelatedOneCPKSKFours = /* GraphQL */ `query ListRelatedOneCPKSKFours(
  $filter: ModelRelatedOneCPKSKFourFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedOneCPKSKFours(
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
      primarySkFour
      primarySkOne
      primarySkThree
      primarySkTwo
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListRelatedOneCPKSKFoursQueryVariables, APITypes.ListRelatedOneCPKSKFoursQuery>;
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
` as GeneratedQuery<APITypes.ListRelatedOneCPKSKOnesQueryVariables, APITypes.ListRelatedOneCPKSKOnesQuery>;
export const listRelatedOneCPKSKThrees = /* GraphQL */ `query ListRelatedOneCPKSKThrees(
  $filter: ModelRelatedOneCPKSKThreeFilterInput
  $id: String
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedOneCPKSKThrees(
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
      primarySkThree
      primarySkTwo
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListRelatedOneCPKSKThreesQueryVariables, APITypes.ListRelatedOneCPKSKThreesQuery>;
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
` as GeneratedQuery<APITypes.ListRelatedOneCPKSKTwosQueryVariables, APITypes.ListRelatedOneCPKSKTwosQuery>;
