/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from '../API';
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getPrimary = /* GraphQL */ `query GetPrimary($id: ID!) {
  getPrimary(id: $id) {
    id
    secret
    relatedMany {
      items {
        id
        secret
        primary {
          id
          secret
          createdAt
          updatedAt
          primaryRelatedOneId
          owner
          __typename
        }
        createdAt
        updatedAt
        primaryRelatedManyId
        owner
        __typename
      }
      nextToken
      __typename
    }
    relatedOne {
      id
      secret
      primary {
        id
        secret
        relatedMany {
          nextToken
          __typename
        }
        relatedOne {
          id
          secret
          createdAt
          updatedAt
          relatedOnePrimaryId
          owner
          __typename
        }
        createdAt
        updatedAt
        primaryRelatedOneId
        owner
        __typename
      }
      createdAt
      updatedAt
      relatedOnePrimaryId
      owner
      __typename
    }
    createdAt
    updatedAt
    primaryRelatedOneId
    owner
    __typename
  }
}
` as GeneratedQuery<APITypes.GetPrimaryQueryVariables, APITypes.GetPrimaryQuery>;
export const listPrimaries = /* GraphQL */ `query ListPrimaries(
  $id: ID
  $filter: ModelPrimaryFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listPrimaries(
    id: $id
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      id
      secret
      relatedMany {
        items {
          id
          secret
          createdAt
          updatedAt
          primaryRelatedManyId
          owner
          __typename
        }
        nextToken
        __typename
      }
      relatedOne {
        id
        secret
        primary {
          id
          secret
          createdAt
          updatedAt
          primaryRelatedOneId
          owner
          __typename
        }
        createdAt
        updatedAt
        relatedOnePrimaryId
        owner
        __typename
      }
      createdAt
      updatedAt
      primaryRelatedOneId
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListPrimariesQueryVariables, APITypes.ListPrimariesQuery>;
export const getRelatedMany = /* GraphQL */ `query GetRelatedMany($id: ID!) {
  getRelatedMany(id: $id) {
    id
    secret
    primary {
      id
      secret
      relatedMany {
        items {
          id
          secret
          createdAt
          updatedAt
          primaryRelatedManyId
          owner
          __typename
        }
        nextToken
        __typename
      }
      relatedOne {
        id
        secret
        primary {
          id
          secret
          createdAt
          updatedAt
          primaryRelatedOneId
          owner
          __typename
        }
        createdAt
        updatedAt
        relatedOnePrimaryId
        owner
        __typename
      }
      createdAt
      updatedAt
      primaryRelatedOneId
      owner
      __typename
    }
    createdAt
    updatedAt
    primaryRelatedManyId
    owner
    __typename
  }
}
` as GeneratedQuery<APITypes.GetRelatedManyQueryVariables, APITypes.GetRelatedManyQuery>;
export const listRelatedManies = /* GraphQL */ `query ListRelatedManies(
  $id: ID
  $filter: ModelRelatedManyFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedManies(
    id: $id
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      id
      secret
      primary {
        id
        secret
        relatedMany {
          nextToken
          __typename
        }
        relatedOne {
          id
          secret
          createdAt
          updatedAt
          relatedOnePrimaryId
          owner
          __typename
        }
        createdAt
        updatedAt
        primaryRelatedOneId
        owner
        __typename
      }
      createdAt
      updatedAt
      primaryRelatedManyId
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListRelatedManiesQueryVariables, APITypes.ListRelatedManiesQuery>;
export const getRelatedOne = /* GraphQL */ `query GetRelatedOne($id: ID!) {
  getRelatedOne(id: $id) {
    id
    secret
    primary {
      id
      secret
      relatedMany {
        items {
          id
          secret
          createdAt
          updatedAt
          primaryRelatedManyId
          owner
          __typename
        }
        nextToken
        __typename
      }
      relatedOne {
        id
        secret
        primary {
          id
          secret
          createdAt
          updatedAt
          primaryRelatedOneId
          owner
          __typename
        }
        createdAt
        updatedAt
        relatedOnePrimaryId
        owner
        __typename
      }
      createdAt
      updatedAt
      primaryRelatedOneId
      owner
      __typename
    }
    createdAt
    updatedAt
    relatedOnePrimaryId
    owner
    __typename
  }
}
` as GeneratedQuery<APITypes.GetRelatedOneQueryVariables, APITypes.GetRelatedOneQuery>;
export const listRelatedOnes = /* GraphQL */ `query ListRelatedOnes(
  $id: ID
  $filter: ModelRelatedOneFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listRelatedOnes(
    id: $id
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      id
      secret
      primary {
        id
        secret
        relatedMany {
          nextToken
          __typename
        }
        relatedOne {
          id
          secret
          createdAt
          updatedAt
          relatedOnePrimaryId
          owner
          __typename
        }
        createdAt
        updatedAt
        primaryRelatedOneId
        owner
        __typename
      }
      createdAt
      updatedAt
      relatedOnePrimaryId
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListRelatedOnesQueryVariables, APITypes.ListRelatedOnesQuery>;
export const getManyLeft = /* GraphQL */ `query GetManyLeft($id: ID!) {
  getManyLeft(id: $id) {
    id
    secret
    manyRight {
      items {
        id
        manyLeftId
        manyRightId
        manyLeft {
          id
          secret
          createdAt
          updatedAt
          owner
          __typename
        }
        manyRight {
          id
          secret
          createdAt
          updatedAt
          owner
          __typename
        }
        createdAt
        updatedAt
        owner
        __typename
      }
      nextToken
      __typename
    }
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedQuery<APITypes.GetManyLeftQueryVariables, APITypes.GetManyLeftQuery>;
export const listManyLefts = /* GraphQL */ `query ListManyLefts(
  $id: ID
  $filter: ModelManyLeftFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listManyLefts(
    id: $id
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      id
      secret
      manyRight {
        items {
          id
          manyLeftId
          manyRightId
          createdAt
          updatedAt
          owner
          __typename
        }
        nextToken
        __typename
      }
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListManyLeftsQueryVariables, APITypes.ListManyLeftsQuery>;
export const getManyRight = /* GraphQL */ `query GetManyRight($id: ID!) {
  getManyRight(id: $id) {
    id
    secret
    manyLeft {
      items {
        id
        manyLeftId
        manyRightId
        manyLeft {
          id
          secret
          createdAt
          updatedAt
          owner
          __typename
        }
        manyRight {
          id
          secret
          createdAt
          updatedAt
          owner
          __typename
        }
        createdAt
        updatedAt
        owner
        __typename
      }
      nextToken
      __typename
    }
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedQuery<APITypes.GetManyRightQueryVariables, APITypes.GetManyRightQuery>;
export const listManyRights = /* GraphQL */ `query ListManyRights(
  $id: ID
  $filter: ModelManyRightFilterInput
  $limit: Int
  $nextToken: String
  $sortDirection: ModelSortDirection
) {
  listManyRights(
    id: $id
    filter: $filter
    limit: $limit
    nextToken: $nextToken
    sortDirection: $sortDirection
  ) {
    items {
      id
      secret
      manyLeft {
        items {
          id
          manyLeftId
          manyRightId
          createdAt
          updatedAt
          owner
          __typename
        }
        nextToken
        __typename
      }
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListManyRightsQueryVariables, APITypes.ListManyRightsQuery>;
export const getLeftRightJoin = /* GraphQL */ `query GetLeftRightJoin($id: ID!) {
  getLeftRightJoin(id: $id) {
    id
    manyLeftId
    manyRightId
    manyLeft {
      id
      secret
      manyRight {
        items {
          id
          manyLeftId
          manyRightId
          createdAt
          updatedAt
          owner
          __typename
        }
        nextToken
        __typename
      }
      createdAt
      updatedAt
      owner
      __typename
    }
    manyRight {
      id
      secret
      manyLeft {
        items {
          id
          manyLeftId
          manyRightId
          createdAt
          updatedAt
          owner
          __typename
        }
        nextToken
        __typename
      }
      createdAt
      updatedAt
      owner
      __typename
    }
    createdAt
    updatedAt
    owner
    __typename
  }
}
` as GeneratedQuery<APITypes.GetLeftRightJoinQueryVariables, APITypes.GetLeftRightJoinQuery>;
export const listLeftRightJoins = /* GraphQL */ `query ListLeftRightJoins(
  $filter: ModelLeftRightJoinFilterInput
  $limit: Int
  $nextToken: String
) {
  listLeftRightJoins(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      manyLeftId
      manyRightId
      manyLeft {
        id
        secret
        manyRight {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        owner
        __typename
      }
      manyRight {
        id
        secret
        manyLeft {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        owner
        __typename
      }
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.ListLeftRightJoinsQueryVariables, APITypes.ListLeftRightJoinsQuery>;
export const leftRightJoinsByManyLeftId = /* GraphQL */ `query LeftRightJoinsByManyLeftId(
  $manyLeftId: ID!
  $sortDirection: ModelSortDirection
  $filter: ModelLeftRightJoinFilterInput
  $limit: Int
  $nextToken: String
) {
  leftRightJoinsByManyLeftId(
    manyLeftId: $manyLeftId
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      manyLeftId
      manyRightId
      manyLeft {
        id
        secret
        manyRight {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        owner
        __typename
      }
      manyRight {
        id
        secret
        manyLeft {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        owner
        __typename
      }
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.LeftRightJoinsByManyLeftIdQueryVariables, APITypes.LeftRightJoinsByManyLeftIdQuery>;
export const leftRightJoinsByManyRightId = /* GraphQL */ `query LeftRightJoinsByManyRightId(
  $manyRightId: ID!
  $sortDirection: ModelSortDirection
  $filter: ModelLeftRightJoinFilterInput
  $limit: Int
  $nextToken: String
) {
  leftRightJoinsByManyRightId(
    manyRightId: $manyRightId
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      manyLeftId
      manyRightId
      manyLeft {
        id
        secret
        manyRight {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        owner
        __typename
      }
      manyRight {
        id
        secret
        manyLeft {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        owner
        __typename
      }
      createdAt
      updatedAt
      owner
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<APITypes.LeftRightJoinsByManyRightIdQueryVariables, APITypes.LeftRightJoinsByManyRightIdQuery>;
