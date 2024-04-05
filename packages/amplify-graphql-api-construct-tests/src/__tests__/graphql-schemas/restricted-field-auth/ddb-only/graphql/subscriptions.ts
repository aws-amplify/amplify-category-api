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
` as GeneratedSubscription<APITypes.OnCreatePrimarySubscriptionVariables, APITypes.OnCreatePrimarySubscription>;
export const onUpdatePrimary = /* GraphQL */ `subscription OnUpdatePrimary(
  $filter: ModelSubscriptionPrimaryFilterInput
  $owner: String
) {
  onUpdatePrimary(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdatePrimarySubscriptionVariables, APITypes.OnUpdatePrimarySubscription>;
export const onDeletePrimary = /* GraphQL */ `subscription OnDeletePrimary(
  $filter: ModelSubscriptionPrimaryFilterInput
  $owner: String
) {
  onDeletePrimary(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeletePrimarySubscriptionVariables, APITypes.OnDeletePrimarySubscription>;
export const onCreateRelatedMany = /* GraphQL */ `subscription OnCreateRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
  $owner: String
) {
  onCreateRelatedMany(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedManySubscriptionVariables, APITypes.OnCreateRelatedManySubscription>;
export const onUpdateRelatedMany = /* GraphQL */ `subscription OnUpdateRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
  $owner: String
) {
  onUpdateRelatedMany(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedManySubscriptionVariables, APITypes.OnUpdateRelatedManySubscription>;
export const onDeleteRelatedMany = /* GraphQL */ `subscription OnDeleteRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
  $owner: String
) {
  onDeleteRelatedMany(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedManySubscriptionVariables, APITypes.OnDeleteRelatedManySubscription>;
export const onCreateRelatedOne = /* GraphQL */ `subscription OnCreateRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
  $owner: String
) {
  onCreateRelatedOne(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedOneSubscriptionVariables, APITypes.OnCreateRelatedOneSubscription>;
export const onUpdateRelatedOne = /* GraphQL */ `subscription OnUpdateRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
  $owner: String
) {
  onUpdateRelatedOne(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedOneSubscriptionVariables, APITypes.OnUpdateRelatedOneSubscription>;
export const onDeleteRelatedOne = /* GraphQL */ `subscription OnDeleteRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
  $owner: String
) {
  onDeleteRelatedOne(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedOneSubscriptionVariables, APITypes.OnDeleteRelatedOneSubscription>;
export const onCreateManyLeft = /* GraphQL */ `subscription OnCreateManyLeft(
  $filter: ModelSubscriptionManyLeftFilterInput
  $owner: String
) {
  onCreateManyLeft(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnCreateManyLeftSubscriptionVariables, APITypes.OnCreateManyLeftSubscription>;
export const onUpdateManyLeft = /* GraphQL */ `subscription OnUpdateManyLeft(
  $filter: ModelSubscriptionManyLeftFilterInput
  $owner: String
) {
  onUpdateManyLeft(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdateManyLeftSubscriptionVariables, APITypes.OnUpdateManyLeftSubscription>;
export const onDeleteManyLeft = /* GraphQL */ `subscription OnDeleteManyLeft(
  $filter: ModelSubscriptionManyLeftFilterInput
  $owner: String
) {
  onDeleteManyLeft(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeleteManyLeftSubscriptionVariables, APITypes.OnDeleteManyLeftSubscription>;
export const onCreateManyRight = /* GraphQL */ `subscription OnCreateManyRight(
  $filter: ModelSubscriptionManyRightFilterInput
  $owner: String
) {
  onCreateManyRight(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnCreateManyRightSubscriptionVariables, APITypes.OnCreateManyRightSubscription>;
export const onUpdateManyRight = /* GraphQL */ `subscription OnUpdateManyRight(
  $filter: ModelSubscriptionManyRightFilterInput
  $owner: String
) {
  onUpdateManyRight(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdateManyRightSubscriptionVariables, APITypes.OnUpdateManyRightSubscription>;
export const onDeleteManyRight = /* GraphQL */ `subscription OnDeleteManyRight(
  $filter: ModelSubscriptionManyRightFilterInput
  $owner: String
) {
  onDeleteManyRight(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeleteManyRightSubscriptionVariables, APITypes.OnDeleteManyRightSubscription>;
export const onCreateLeftRightJoin = /* GraphQL */ `subscription OnCreateLeftRightJoin(
  $filter: ModelSubscriptionLeftRightJoinFilterInput
  $owner: String
) {
  onCreateLeftRightJoin(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnCreateLeftRightJoinSubscriptionVariables, APITypes.OnCreateLeftRightJoinSubscription>;
export const onUpdateLeftRightJoin = /* GraphQL */ `subscription OnUpdateLeftRightJoin(
  $filter: ModelSubscriptionLeftRightJoinFilterInput
  $owner: String
) {
  onUpdateLeftRightJoin(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnUpdateLeftRightJoinSubscriptionVariables, APITypes.OnUpdateLeftRightJoinSubscription>;
export const onDeleteLeftRightJoin = /* GraphQL */ `subscription OnDeleteLeftRightJoin(
  $filter: ModelSubscriptionLeftRightJoinFilterInput
  $owner: String
) {
  onDeleteLeftRightJoin(filter: $filter, owner: $owner) {
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
` as GeneratedSubscription<APITypes.OnDeleteLeftRightJoinSubscriptionVariables, APITypes.OnDeleteLeftRightJoinSubscription>;
