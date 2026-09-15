/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from './API';
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreatePrimary = /* GraphQL */ `subscription OnCreatePrimary($filter: ModelSubscriptionPrimaryFilterInput) {
  onCreatePrimary(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreatePrimarySubscriptionVariables, APITypes.OnCreatePrimarySubscription>;
export const onUpdatePrimary = /* GraphQL */ `subscription OnUpdatePrimary($filter: ModelSubscriptionPrimaryFilterInput) {
  onUpdatePrimary(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdatePrimarySubscriptionVariables, APITypes.OnUpdatePrimarySubscription>;
export const onDeletePrimary = /* GraphQL */ `subscription OnDeletePrimary($filter: ModelSubscriptionPrimaryFilterInput) {
  onDeletePrimary(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeletePrimarySubscriptionVariables, APITypes.OnDeletePrimarySubscription>;
export const onCreateRelatedMany = /* GraphQL */ `subscription OnCreateRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
) {
  onCreateRelatedMany(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedManySubscriptionVariables, APITypes.OnCreateRelatedManySubscription>;
export const onUpdateRelatedMany = /* GraphQL */ `subscription OnUpdateRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
) {
  onUpdateRelatedMany(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedManySubscriptionVariables, APITypes.OnUpdateRelatedManySubscription>;
export const onDeleteRelatedMany = /* GraphQL */ `subscription OnDeleteRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
) {
  onDeleteRelatedMany(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedManySubscriptionVariables, APITypes.OnDeleteRelatedManySubscription>;
export const onCreateRelatedOne = /* GraphQL */ `subscription OnCreateRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
) {
  onCreateRelatedOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedOneSubscriptionVariables, APITypes.OnCreateRelatedOneSubscription>;
export const onUpdateRelatedOne = /* GraphQL */ `subscription OnUpdateRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
) {
  onUpdateRelatedOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedOneSubscriptionVariables, APITypes.OnUpdateRelatedOneSubscription>;
export const onDeleteRelatedOne = /* GraphQL */ `subscription OnDeleteRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
) {
  onDeleteRelatedOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedOneSubscriptionVariables, APITypes.OnDeleteRelatedOneSubscription>;
