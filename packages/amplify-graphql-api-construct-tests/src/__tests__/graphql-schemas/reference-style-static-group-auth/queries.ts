/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from './API';
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getPrimary = /* GraphQL */ `query GetPrimary($id: String!) {
  getPrimary(id: $id) {
    id
    content
    relatedMany {
      items {
        id
        content
        primaryId
        primary {
          id
          content
        }
      }
      nextToken
    }
    relatedOne {
      id
      content
      primaryId
      primary {
        id
        content
        relatedMany {
          nextToken
        }
        relatedOne {
          id
          content
          primaryId
        }
      }
    }
  }
}
` as GeneratedQuery<APITypes.GetPrimaryQueryVariables, APITypes.GetPrimaryQuery>;
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
      content
      relatedMany {
        items {
          id
          content
          primaryId
        }
        nextToken
      }
      relatedOne {
        id
        content
        primaryId
        primary {
          id
          content
        }
      }
    }
    nextToken
  }
}
` as GeneratedQuery<APITypes.ListPrimariesQueryVariables, APITypes.ListPrimariesQuery>;
export const getRelatedMany = /* GraphQL */ `query GetRelatedMany($id: String!) {
  getRelatedMany(id: $id) {
    id
    content
    primaryId
    primary {
      id
      content
      relatedMany {
        items {
          id
          content
          primaryId
        }
        nextToken
      }
      relatedOne {
        id
        content
        primaryId
        primary {
          id
          content
        }
      }
    }
  }
}
` as GeneratedQuery<APITypes.GetRelatedManyQueryVariables, APITypes.GetRelatedManyQuery>;
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
      content
      primaryId
      primary {
        id
        content
        relatedMany {
          nextToken
        }
        relatedOne {
          id
          content
          primaryId
        }
      }
    }
    nextToken
  }
}
` as GeneratedQuery<APITypes.ListRelatedManiesQueryVariables, APITypes.ListRelatedManiesQuery>;
export const getRelatedOne = /* GraphQL */ `query GetRelatedOne($id: String!) {
  getRelatedOne(id: $id) {
    id
    content
    primaryId
    primary {
      id
      content
      relatedMany {
        items {
          id
          content
          primaryId
        }
        nextToken
      }
      relatedOne {
        id
        content
        primaryId
        primary {
          id
          content
        }
      }
    }
  }
}
` as GeneratedQuery<APITypes.GetRelatedOneQueryVariables, APITypes.GetRelatedOneQuery>;
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
      content
      primaryId
      primary {
        id
        content
        relatedMany {
          nextToken
        }
        relatedOne {
          id
          content
          primaryId
        }
      }
    }
    nextToken
  }
}
` as GeneratedQuery<APITypes.ListRelatedOnesQueryVariables, APITypes.ListRelatedOnesQuery>;
