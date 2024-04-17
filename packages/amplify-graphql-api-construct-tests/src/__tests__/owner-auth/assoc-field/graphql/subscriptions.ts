/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from '../API';
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreatePrimary = /* GraphQL */ `subscription OnCreatePrimary(
  $filter: ModelSubscriptionPrimaryFilterInput
  $owner: String
) {
  onCreatePrimary(filter: $filter, owner: $owner) {
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
      __typename
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
          __typename
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
` as GeneratedSubscription<APITypes.OnCreatePrimarySubscriptionVariables, APITypes.OnCreatePrimarySubscription>;
export const onUpdatePrimary = /* GraphQL */ `subscription OnUpdatePrimary(
  $filter: ModelSubscriptionPrimaryFilterInput
  $owner: String
) {
  onUpdatePrimary(filter: $filter, owner: $owner) {
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
      __typename
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
          __typename
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
` as GeneratedSubscription<APITypes.OnUpdatePrimarySubscriptionVariables, APITypes.OnUpdatePrimarySubscription>;
export const onDeletePrimary = /* GraphQL */ `subscription OnDeletePrimary(
  $filter: ModelSubscriptionPrimaryFilterInput
  $owner: String
) {
  onDeletePrimary(filter: $filter, owner: $owner) {
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
      __typename
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
          __typename
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
` as GeneratedSubscription<APITypes.OnDeletePrimarySubscriptionVariables, APITypes.OnDeletePrimarySubscription>;
export const onCreateRelatedMany = /* GraphQL */ `subscription OnCreateRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
  $owner: String
) {
  onCreateRelatedMany(filter: $filter, owner: $owner) {
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
        __typename
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
` as GeneratedSubscription<APITypes.OnCreateRelatedManySubscriptionVariables, APITypes.OnCreateRelatedManySubscription>;
export const onUpdateRelatedMany = /* GraphQL */ `subscription OnUpdateRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
  $owner: String
) {
  onUpdateRelatedMany(filter: $filter, owner: $owner) {
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
        __typename
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedManySubscriptionVariables, APITypes.OnUpdateRelatedManySubscription>;
export const onDeleteRelatedMany = /* GraphQL */ `subscription OnDeleteRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
  $owner: String
) {
  onDeleteRelatedMany(filter: $filter, owner: $owner) {
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
        __typename
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedManySubscriptionVariables, APITypes.OnDeleteRelatedManySubscription>;
export const onCreateRelatedOne = /* GraphQL */ `subscription OnCreateRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
  $owner: String
) {
  onCreateRelatedOne(filter: $filter, owner: $owner) {
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
        __typename
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
` as GeneratedSubscription<APITypes.OnCreateRelatedOneSubscriptionVariables, APITypes.OnCreateRelatedOneSubscription>;
export const onUpdateRelatedOne = /* GraphQL */ `subscription OnUpdateRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
  $owner: String
) {
  onUpdateRelatedOne(filter: $filter, owner: $owner) {
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
        __typename
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedOneSubscriptionVariables, APITypes.OnUpdateRelatedOneSubscription>;
export const onDeleteRelatedOne = /* GraphQL */ `subscription OnDeleteRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
  $owner: String
) {
  onDeleteRelatedOne(filter: $filter, owner: $owner) {
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
        __typename
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedOneSubscriptionVariables, APITypes.OnDeleteRelatedOneSubscription>;
