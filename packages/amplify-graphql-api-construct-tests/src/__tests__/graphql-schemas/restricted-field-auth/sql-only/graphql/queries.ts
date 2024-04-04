/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getPrimary = /* GraphQL */ `query GetPrimary($id: String!) {
  getPrimary(id: $id) {
    id
    secret
    owner
    relatedMany {
      items {
        id
        secret
        owner
        primaryId
        primary {
          id
          secret
          owner
          __typename
        }
        __typename
      }
      nextToken
      __typename
    }
    relatedOne {
      id
      secret
      owner
      primaryId
      primary {
        id
        secret
        owner
        relatedMany {
          nextToken
          __typename
        }
        relatedOne {
          id
          secret
          owner
          primaryId
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetPrimaryQueryVariables,
  APITypes.GetPrimaryQuery
>;
export const listPrimaries = /* GraphQL */ `query ListPrimaries(
  $id: String
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
      owner
      relatedMany {
        items {
          id
          secret
          owner
          primaryId
          __typename
        }
        nextToken
        __typename
      }
      relatedOne {
        id
        secret
        owner
        primaryId
        primary {
          id
          secret
          owner
          __typename
        }
        __typename
      }
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
export const primariesByOwner = /* GraphQL */ `query PrimariesByOwner(
  $owner: String!
  $sortDirection: ModelSortDirection
  $filter: ModelPrimaryFilterInput
  $limit: Int
  $nextToken: String
) {
  primariesByOwner(
    owner: $owner
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      secret
      owner
      relatedMany {
        items {
          id
          secret
          owner
          primaryId
          __typename
        }
        nextToken
        __typename
      }
      relatedOne {
        id
        secret
        owner
        primaryId
        primary {
          id
          secret
          owner
          __typename
        }
        __typename
      }
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.PrimariesByOwnerQueryVariables,
  APITypes.PrimariesByOwnerQuery
>;
export const getRelatedMany = /* GraphQL */ `query GetRelatedMany($id: String!) {
  getRelatedMany(id: $id) {
    id
    secret
    owner
    primaryId
    primary {
      id
      secret
      owner
      relatedMany {
        items {
          id
          secret
          owner
          primaryId
          __typename
        }
        nextToken
        __typename
      }
      relatedOne {
        id
        secret
        owner
        primaryId
        primary {
          id
          secret
          owner
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetRelatedManyQueryVariables,
  APITypes.GetRelatedManyQuery
>;
export const listRelatedManies = /* GraphQL */ `query ListRelatedManies(
  $id: String
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
      owner
      primaryId
      primary {
        id
        secret
        owner
        relatedMany {
          nextToken
          __typename
        }
        relatedOne {
          id
          secret
          owner
          primaryId
          __typename
        }
        __typename
      }
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
export const relatedManiesByOwner = /* GraphQL */ `query RelatedManiesByOwner(
  $owner: String!
  $sortDirection: ModelSortDirection
  $filter: ModelRelatedManyFilterInput
  $limit: Int
  $nextToken: String
) {
  relatedManiesByOwner(
    owner: $owner
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      secret
      owner
      primaryId
      primary {
        id
        secret
        owner
        relatedMany {
          nextToken
          __typename
        }
        relatedOne {
          id
          secret
          owner
          primaryId
          __typename
        }
        __typename
      }
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.RelatedManiesByOwnerQueryVariables,
  APITypes.RelatedManiesByOwnerQuery
>;
export const relatedManiesByPrimaryId = /* GraphQL */ `query RelatedManiesByPrimaryId(
  $primaryId: String!
  $sortDirection: ModelSortDirection
  $filter: ModelRelatedManyFilterInput
  $limit: Int
  $nextToken: String
) {
  relatedManiesByPrimaryId(
    primaryId: $primaryId
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      secret
      owner
      primaryId
      primary {
        id
        secret
        owner
        relatedMany {
          nextToken
          __typename
        }
        relatedOne {
          id
          secret
          owner
          primaryId
          __typename
        }
        __typename
      }
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.RelatedManiesByPrimaryIdQueryVariables,
  APITypes.RelatedManiesByPrimaryIdQuery
>;
export const getRelatedOne = /* GraphQL */ `query GetRelatedOne($id: String!) {
  getRelatedOne(id: $id) {
    id
    secret
    owner
    primaryId
    primary {
      id
      secret
      owner
      relatedMany {
        items {
          id
          secret
          owner
          primaryId
          __typename
        }
        nextToken
        __typename
      }
      relatedOne {
        id
        secret
        owner
        primaryId
        primary {
          id
          secret
          owner
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetRelatedOneQueryVariables,
  APITypes.GetRelatedOneQuery
>;
export const listRelatedOnes = /* GraphQL */ `query ListRelatedOnes(
  $id: String
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
      owner
      primaryId
      primary {
        id
        secret
        owner
        relatedMany {
          nextToken
          __typename
        }
        relatedOne {
          id
          secret
          owner
          primaryId
          __typename
        }
        __typename
      }
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
export const relatedOnesByOwner = /* GraphQL */ `query RelatedOnesByOwner(
  $owner: String!
  $sortDirection: ModelSortDirection
  $filter: ModelRelatedOneFilterInput
  $limit: Int
  $nextToken: String
) {
  relatedOnesByOwner(
    owner: $owner
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      secret
      owner
      primaryId
      primary {
        id
        secret
        owner
        relatedMany {
          nextToken
          __typename
        }
        relatedOne {
          id
          secret
          owner
          primaryId
          __typename
        }
        __typename
      }
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.RelatedOnesByOwnerQueryVariables,
  APITypes.RelatedOnesByOwnerQuery
>;
export const relatedOnesByPrimaryId = /* GraphQL */ `query RelatedOnesByPrimaryId(
  $primaryId: String!
  $sortDirection: ModelSortDirection
  $filter: ModelRelatedOneFilterInput
  $limit: Int
  $nextToken: String
) {
  relatedOnesByPrimaryId(
    primaryId: $primaryId
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      secret
      owner
      primaryId
      primary {
        id
        secret
        owner
        relatedMany {
          nextToken
          __typename
        }
        relatedOne {
          id
          secret
          owner
          primaryId
          __typename
        }
        __typename
      }
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.RelatedOnesByPrimaryIdQueryVariables,
  APITypes.RelatedOnesByPrimaryIdQuery
>;
