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
    content
    relatedMany1 {
      items {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
      nextToken
    }
    relatedMany2 {
      items {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
      nextToken
    }
    relatedOne1 {
      id
      content
      primaryId1
      primary1 {
        id
        content
        relatedMany1 {
          nextToken
        }
        relatedMany2 {
          nextToken
        }
        relatedOne1 {
          id
          content
          primaryId1
          primaryId2
        }
        relatedOne2 {
          id
          content
          primaryId1
          primaryId2
        }
      }
      primaryId2
      primary2 {
        id
        content
        relatedMany1 {
          nextToken
        }
        relatedMany2 {
          nextToken
        }
        relatedOne1 {
          id
          content
          primaryId1
          primaryId2
        }
        relatedOne2 {
          id
          content
          primaryId1
          primaryId2
        }
      }
    }
    relatedOne2 {
      id
      content
      primaryId1
      primary1 {
        id
        content
        relatedMany1 {
          nextToken
        }
        relatedMany2 {
          nextToken
        }
        relatedOne1 {
          id
          content
          primaryId1
          primaryId2
        }
        relatedOne2 {
          id
          content
          primaryId1
          primaryId2
        }
      }
      primaryId2
      primary2 {
        id
        content
        relatedMany1 {
          nextToken
        }
        relatedMany2 {
          nextToken
        }
        relatedOne1 {
          id
          content
          primaryId1
          primaryId2
        }
        relatedOne2 {
          id
          content
          primaryId1
          primaryId2
        }
      }
    }
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
      content
      relatedMany1 {
        items {
          id
          content
          primaryId1
          primaryId2
        }
        nextToken
      }
      relatedMany2 {
        items {
          id
          content
          primaryId1
          primaryId2
        }
        nextToken
      }
      relatedOne1 {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
      relatedOne2 {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
    }
    nextToken
  }
}
` as GeneratedQuery<APITypes.ListPrimariesQueryVariables, APITypes.ListPrimariesQuery>;
export const getRelatedMany = /* GraphQL */ `query GetRelatedMany($id: ID!) {
  getRelatedMany(id: $id) {
    id
    content
    primaryId1
    primary1 {
      id
      content
      relatedMany1 {
        items {
          id
          content
          primaryId1
          primaryId2
        }
        nextToken
      }
      relatedMany2 {
        items {
          id
          content
          primaryId1
          primaryId2
        }
        nextToken
      }
      relatedOne1 {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
      relatedOne2 {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
    }
    primaryId2
    primary2 {
      id
      content
      relatedMany1 {
        items {
          id
          content
          primaryId1
          primaryId2
        }
        nextToken
      }
      relatedMany2 {
        items {
          id
          content
          primaryId1
          primaryId2
        }
        nextToken
      }
      relatedOne1 {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
      relatedOne2 {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
    }
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
      content
      primaryId1
      primary1 {
        id
        content
        relatedMany1 {
          nextToken
        }
        relatedMany2 {
          nextToken
        }
        relatedOne1 {
          id
          content
          primaryId1
          primaryId2
        }
        relatedOne2 {
          id
          content
          primaryId1
          primaryId2
        }
      }
      primaryId2
      primary2 {
        id
        content
        relatedMany1 {
          nextToken
        }
        relatedMany2 {
          nextToken
        }
        relatedOne1 {
          id
          content
          primaryId1
          primaryId2
        }
        relatedOne2 {
          id
          content
          primaryId1
          primaryId2
        }
      }
    }
    nextToken
  }
}
` as GeneratedQuery<APITypes.ListRelatedManiesQueryVariables, APITypes.ListRelatedManiesQuery>;
export const getRelatedOne = /* GraphQL */ `query GetRelatedOne($id: ID!) {
  getRelatedOne(id: $id) {
    id
    content
    primaryId1
    primary1 {
      id
      content
      relatedMany1 {
        items {
          id
          content
          primaryId1
          primaryId2
        }
        nextToken
      }
      relatedMany2 {
        items {
          id
          content
          primaryId1
          primaryId2
        }
        nextToken
      }
      relatedOne1 {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
      relatedOne2 {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
    }
    primaryId2
    primary2 {
      id
      content
      relatedMany1 {
        items {
          id
          content
          primaryId1
          primaryId2
        }
        nextToken
      }
      relatedMany2 {
        items {
          id
          content
          primaryId1
          primaryId2
        }
        nextToken
      }
      relatedOne1 {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
      relatedOne2 {
        id
        content
        primaryId1
        primary1 {
          id
          content
        }
        primaryId2
        primary2 {
          id
          content
        }
      }
    }
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
      content
      primaryId1
      primary1 {
        id
        content
        relatedMany1 {
          nextToken
        }
        relatedMany2 {
          nextToken
        }
        relatedOne1 {
          id
          content
          primaryId1
          primaryId2
        }
        relatedOne2 {
          id
          content
          primaryId1
          primaryId2
        }
      }
      primaryId2
      primary2 {
        id
        content
        relatedMany1 {
          nextToken
        }
        relatedMany2 {
          nextToken
        }
        relatedOne1 {
          id
          content
          primaryId1
          primaryId2
        }
        relatedOne2 {
          id
          content
          primaryId1
          primaryId2
        }
      }
    }
    nextToken
  }
}
` as GeneratedQuery<APITypes.ListRelatedOnesQueryVariables, APITypes.ListRelatedOnesQuery>;
