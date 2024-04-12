/* tslint:disable */
/* eslint-disable */

import * as APITypes from "../API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getPrimary = /* GraphQL */ `query GetPrimary($id: String!) {
  getPrimary(id: $id) {
    id
    owner
    relatedMany {
      items {
        id
        owner
        primaryId
        primary {
          id
          owner
        }
      }
      nextToken
    }
    relatedOne {
      id
      owner
      primaryId
      primary {
        id
        owner
        relatedMany {
          nextToken
        }
        relatedOne {
          id
          owner
          primaryId
        }
      }
    }
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
      owner
      relatedMany {
        items {
          id
          owner
          primaryId
        }
        nextToken
      }
      relatedOne {
        id
        owner
        primaryId
        primary {
          id
          owner
        }
      }
    }
    nextToken
  }
}
` as GeneratedQuery<
  APITypes.ListPrimariesQueryVariables,
  APITypes.ListPrimariesQuery
>;
export const getRelatedMany = /* GraphQL */ `query GetRelatedMany($id: String!) {
  getRelatedMany(id: $id) {
    id
    owner
    primaryId
    primary {
      id
      owner
      relatedMany {
        items {
          id
          owner
          primaryId
        }
        nextToken
      }
      relatedOne {
        id
        owner
        primaryId
        primary {
          id
          owner
        }
      }
    }
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
      owner
      primaryId
      primary {
        id
        owner
        relatedMany {
          nextToken
        }
        relatedOne {
          id
          owner
          primaryId
        }
      }
    }
    nextToken
  }
}
` as GeneratedQuery<
  APITypes.ListRelatedManiesQueryVariables,
  APITypes.ListRelatedManiesQuery
>;
export const getRelatedOne = /* GraphQL */ `query GetRelatedOne($id: String!) {
  getRelatedOne(id: $id) {
    id
    owner
    primaryId
    primary {
      id
      owner
      relatedMany {
        items {
          id
          owner
          primaryId
        }
        nextToken
      }
      relatedOne {
        id
        owner
        primaryId
        primary {
          id
          owner
        }
      }
    }
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
      owner
      primaryId
      primary {
        id
        owner
        relatedMany {
          nextToken
        }
        relatedOne {
          id
          owner
          primaryId
        }
      }
    }
    nextToken
  }
}
` as GeneratedQuery<
  APITypes.ListRelatedOnesQueryVariables,
  APITypes.ListRelatedOnesQuery
>;
