/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from '../API';
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreatePrimaryCPKSKFour = /* GraphQL */ `subscription OnCreatePrimaryCPKSKFour(
  $filter: ModelSubscriptionPrimaryCPKSKFourFilterInput
) {
  onCreatePrimaryCPKSKFour(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreatePrimaryCPKSKFourSubscriptionVariables, APITypes.OnCreatePrimaryCPKSKFourSubscription>;
export const onCreatePrimaryCPKSKOne = /* GraphQL */ `subscription OnCreatePrimaryCPKSKOne(
  $filter: ModelSubscriptionPrimaryCPKSKOneFilterInput
) {
  onCreatePrimaryCPKSKOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreatePrimaryCPKSKOneSubscriptionVariables, APITypes.OnCreatePrimaryCPKSKOneSubscription>;
export const onCreatePrimaryCPKSKThree = /* GraphQL */ `subscription OnCreatePrimaryCPKSKThree(
  $filter: ModelSubscriptionPrimaryCPKSKThreeFilterInput
) {
  onCreatePrimaryCPKSKThree(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreatePrimaryCPKSKThreeSubscriptionVariables, APITypes.OnCreatePrimaryCPKSKThreeSubscription>;
export const onCreatePrimaryCPKSKTwo = /* GraphQL */ `subscription OnCreatePrimaryCPKSKTwo(
  $filter: ModelSubscriptionPrimaryCPKSKTwoFilterInput
) {
  onCreatePrimaryCPKSKTwo(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreatePrimaryCPKSKTwoSubscriptionVariables, APITypes.OnCreatePrimaryCPKSKTwoSubscription>;
export const onCreateRelatedManyCPKSKFour = /* GraphQL */ `subscription OnCreateRelatedManyCPKSKFour(
  $filter: ModelSubscriptionRelatedManyCPKSKFourFilterInput
) {
  onCreateRelatedManyCPKSKFour(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedManyCPKSKFourSubscriptionVariables, APITypes.OnCreateRelatedManyCPKSKFourSubscription>;
export const onCreateRelatedManyCPKSKOne = /* GraphQL */ `subscription OnCreateRelatedManyCPKSKOne(
  $filter: ModelSubscriptionRelatedManyCPKSKOneFilterInput
) {
  onCreateRelatedManyCPKSKOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedManyCPKSKOneSubscriptionVariables, APITypes.OnCreateRelatedManyCPKSKOneSubscription>;
export const onCreateRelatedManyCPKSKThree = /* GraphQL */ `subscription OnCreateRelatedManyCPKSKThree(
  $filter: ModelSubscriptionRelatedManyCPKSKThreeFilterInput
) {
  onCreateRelatedManyCPKSKThree(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedManyCPKSKThreeSubscriptionVariables, APITypes.OnCreateRelatedManyCPKSKThreeSubscription>;
export const onCreateRelatedManyCPKSKTwo = /* GraphQL */ `subscription OnCreateRelatedManyCPKSKTwo(
  $filter: ModelSubscriptionRelatedManyCPKSKTwoFilterInput
) {
  onCreateRelatedManyCPKSKTwo(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedManyCPKSKTwoSubscriptionVariables, APITypes.OnCreateRelatedManyCPKSKTwoSubscription>;
export const onCreateRelatedOneCPKSKFour = /* GraphQL */ `subscription OnCreateRelatedOneCPKSKFour(
  $filter: ModelSubscriptionRelatedOneCPKSKFourFilterInput
) {
  onCreateRelatedOneCPKSKFour(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedOneCPKSKFourSubscriptionVariables, APITypes.OnCreateRelatedOneCPKSKFourSubscription>;
export const onCreateRelatedOneCPKSKOne = /* GraphQL */ `subscription OnCreateRelatedOneCPKSKOne(
  $filter: ModelSubscriptionRelatedOneCPKSKOneFilterInput
) {
  onCreateRelatedOneCPKSKOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedOneCPKSKOneSubscriptionVariables, APITypes.OnCreateRelatedOneCPKSKOneSubscription>;
export const onCreateRelatedOneCPKSKThree = /* GraphQL */ `subscription OnCreateRelatedOneCPKSKThree(
  $filter: ModelSubscriptionRelatedOneCPKSKThreeFilterInput
) {
  onCreateRelatedOneCPKSKThree(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedOneCPKSKThreeSubscriptionVariables, APITypes.OnCreateRelatedOneCPKSKThreeSubscription>;
export const onCreateRelatedOneCPKSKTwo = /* GraphQL */ `subscription OnCreateRelatedOneCPKSKTwo(
  $filter: ModelSubscriptionRelatedOneCPKSKTwoFilterInput
) {
  onCreateRelatedOneCPKSKTwo(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnCreateRelatedOneCPKSKTwoSubscriptionVariables, APITypes.OnCreateRelatedOneCPKSKTwoSubscription>;
export const onDeletePrimaryCPKSKFour = /* GraphQL */ `subscription OnDeletePrimaryCPKSKFour(
  $filter: ModelSubscriptionPrimaryCPKSKFourFilterInput
) {
  onDeletePrimaryCPKSKFour(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeletePrimaryCPKSKFourSubscriptionVariables, APITypes.OnDeletePrimaryCPKSKFourSubscription>;
export const onDeletePrimaryCPKSKOne = /* GraphQL */ `subscription OnDeletePrimaryCPKSKOne(
  $filter: ModelSubscriptionPrimaryCPKSKOneFilterInput
) {
  onDeletePrimaryCPKSKOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeletePrimaryCPKSKOneSubscriptionVariables, APITypes.OnDeletePrimaryCPKSKOneSubscription>;
export const onDeletePrimaryCPKSKThree = /* GraphQL */ `subscription OnDeletePrimaryCPKSKThree(
  $filter: ModelSubscriptionPrimaryCPKSKThreeFilterInput
) {
  onDeletePrimaryCPKSKThree(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeletePrimaryCPKSKThreeSubscriptionVariables, APITypes.OnDeletePrimaryCPKSKThreeSubscription>;
export const onDeletePrimaryCPKSKTwo = /* GraphQL */ `subscription OnDeletePrimaryCPKSKTwo(
  $filter: ModelSubscriptionPrimaryCPKSKTwoFilterInput
) {
  onDeletePrimaryCPKSKTwo(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeletePrimaryCPKSKTwoSubscriptionVariables, APITypes.OnDeletePrimaryCPKSKTwoSubscription>;
export const onDeleteRelatedManyCPKSKFour = /* GraphQL */ `subscription OnDeleteRelatedManyCPKSKFour(
  $filter: ModelSubscriptionRelatedManyCPKSKFourFilterInput
) {
  onDeleteRelatedManyCPKSKFour(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedManyCPKSKFourSubscriptionVariables, APITypes.OnDeleteRelatedManyCPKSKFourSubscription>;
export const onDeleteRelatedManyCPKSKOne = /* GraphQL */ `subscription OnDeleteRelatedManyCPKSKOne(
  $filter: ModelSubscriptionRelatedManyCPKSKOneFilterInput
) {
  onDeleteRelatedManyCPKSKOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedManyCPKSKOneSubscriptionVariables, APITypes.OnDeleteRelatedManyCPKSKOneSubscription>;
export const onDeleteRelatedManyCPKSKThree = /* GraphQL */ `subscription OnDeleteRelatedManyCPKSKThree(
  $filter: ModelSubscriptionRelatedManyCPKSKThreeFilterInput
) {
  onDeleteRelatedManyCPKSKThree(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedManyCPKSKThreeSubscriptionVariables, APITypes.OnDeleteRelatedManyCPKSKThreeSubscription>;
export const onDeleteRelatedManyCPKSKTwo = /* GraphQL */ `subscription OnDeleteRelatedManyCPKSKTwo(
  $filter: ModelSubscriptionRelatedManyCPKSKTwoFilterInput
) {
  onDeleteRelatedManyCPKSKTwo(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedManyCPKSKTwoSubscriptionVariables, APITypes.OnDeleteRelatedManyCPKSKTwoSubscription>;
export const onDeleteRelatedOneCPKSKFour = /* GraphQL */ `subscription OnDeleteRelatedOneCPKSKFour(
  $filter: ModelSubscriptionRelatedOneCPKSKFourFilterInput
) {
  onDeleteRelatedOneCPKSKFour(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedOneCPKSKFourSubscriptionVariables, APITypes.OnDeleteRelatedOneCPKSKFourSubscription>;
export const onDeleteRelatedOneCPKSKOne = /* GraphQL */ `subscription OnDeleteRelatedOneCPKSKOne(
  $filter: ModelSubscriptionRelatedOneCPKSKOneFilterInput
) {
  onDeleteRelatedOneCPKSKOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedOneCPKSKOneSubscriptionVariables, APITypes.OnDeleteRelatedOneCPKSKOneSubscription>;
export const onDeleteRelatedOneCPKSKThree = /* GraphQL */ `subscription OnDeleteRelatedOneCPKSKThree(
  $filter: ModelSubscriptionRelatedOneCPKSKThreeFilterInput
) {
  onDeleteRelatedOneCPKSKThree(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedOneCPKSKThreeSubscriptionVariables, APITypes.OnDeleteRelatedOneCPKSKThreeSubscription>;
export const onDeleteRelatedOneCPKSKTwo = /* GraphQL */ `subscription OnDeleteRelatedOneCPKSKTwo(
  $filter: ModelSubscriptionRelatedOneCPKSKTwoFilterInput
) {
  onDeleteRelatedOneCPKSKTwo(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnDeleteRelatedOneCPKSKTwoSubscriptionVariables, APITypes.OnDeleteRelatedOneCPKSKTwoSubscription>;
export const onUpdatePrimaryCPKSKFour = /* GraphQL */ `subscription OnUpdatePrimaryCPKSKFour(
  $filter: ModelSubscriptionPrimaryCPKSKFourFilterInput
) {
  onUpdatePrimaryCPKSKFour(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdatePrimaryCPKSKFourSubscriptionVariables, APITypes.OnUpdatePrimaryCPKSKFourSubscription>;
export const onUpdatePrimaryCPKSKOne = /* GraphQL */ `subscription OnUpdatePrimaryCPKSKOne(
  $filter: ModelSubscriptionPrimaryCPKSKOneFilterInput
) {
  onUpdatePrimaryCPKSKOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdatePrimaryCPKSKOneSubscriptionVariables, APITypes.OnUpdatePrimaryCPKSKOneSubscription>;
export const onUpdatePrimaryCPKSKThree = /* GraphQL */ `subscription OnUpdatePrimaryCPKSKThree(
  $filter: ModelSubscriptionPrimaryCPKSKThreeFilterInput
) {
  onUpdatePrimaryCPKSKThree(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdatePrimaryCPKSKThreeSubscriptionVariables, APITypes.OnUpdatePrimaryCPKSKThreeSubscription>;
export const onUpdatePrimaryCPKSKTwo = /* GraphQL */ `subscription OnUpdatePrimaryCPKSKTwo(
  $filter: ModelSubscriptionPrimaryCPKSKTwoFilterInput
) {
  onUpdatePrimaryCPKSKTwo(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdatePrimaryCPKSKTwoSubscriptionVariables, APITypes.OnUpdatePrimaryCPKSKTwoSubscription>;
export const onUpdateRelatedManyCPKSKFour = /* GraphQL */ `subscription OnUpdateRelatedManyCPKSKFour(
  $filter: ModelSubscriptionRelatedManyCPKSKFourFilterInput
) {
  onUpdateRelatedManyCPKSKFour(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedManyCPKSKFourSubscriptionVariables, APITypes.OnUpdateRelatedManyCPKSKFourSubscription>;
export const onUpdateRelatedManyCPKSKOne = /* GraphQL */ `subscription OnUpdateRelatedManyCPKSKOne(
  $filter: ModelSubscriptionRelatedManyCPKSKOneFilterInput
) {
  onUpdateRelatedManyCPKSKOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedManyCPKSKOneSubscriptionVariables, APITypes.OnUpdateRelatedManyCPKSKOneSubscription>;
export const onUpdateRelatedManyCPKSKThree = /* GraphQL */ `subscription OnUpdateRelatedManyCPKSKThree(
  $filter: ModelSubscriptionRelatedManyCPKSKThreeFilterInput
) {
  onUpdateRelatedManyCPKSKThree(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedManyCPKSKThreeSubscriptionVariables, APITypes.OnUpdateRelatedManyCPKSKThreeSubscription>;
export const onUpdateRelatedManyCPKSKTwo = /* GraphQL */ `subscription OnUpdateRelatedManyCPKSKTwo(
  $filter: ModelSubscriptionRelatedManyCPKSKTwoFilterInput
) {
  onUpdateRelatedManyCPKSKTwo(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedManyCPKSKTwoSubscriptionVariables, APITypes.OnUpdateRelatedManyCPKSKTwoSubscription>;
export const onUpdateRelatedOneCPKSKFour = /* GraphQL */ `subscription OnUpdateRelatedOneCPKSKFour(
  $filter: ModelSubscriptionRelatedOneCPKSKFourFilterInput
) {
  onUpdateRelatedOneCPKSKFour(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedOneCPKSKFourSubscriptionVariables, APITypes.OnUpdateRelatedOneCPKSKFourSubscription>;
export const onUpdateRelatedOneCPKSKOne = /* GraphQL */ `subscription OnUpdateRelatedOneCPKSKOne(
  $filter: ModelSubscriptionRelatedOneCPKSKOneFilterInput
) {
  onUpdateRelatedOneCPKSKOne(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedOneCPKSKOneSubscriptionVariables, APITypes.OnUpdateRelatedOneCPKSKOneSubscription>;
export const onUpdateRelatedOneCPKSKThree = /* GraphQL */ `subscription OnUpdateRelatedOneCPKSKThree(
  $filter: ModelSubscriptionRelatedOneCPKSKThreeFilterInput
) {
  onUpdateRelatedOneCPKSKThree(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedOneCPKSKThreeSubscriptionVariables, APITypes.OnUpdateRelatedOneCPKSKThreeSubscription>;
export const onUpdateRelatedOneCPKSKTwo = /* GraphQL */ `subscription OnUpdateRelatedOneCPKSKTwo(
  $filter: ModelSubscriptionRelatedOneCPKSKTwoFilterInput
) {
  onUpdateRelatedOneCPKSKTwo(filter: $filter) {
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
` as GeneratedSubscription<APITypes.OnUpdateRelatedOneCPKSKTwoSubscriptionVariables, APITypes.OnUpdateRelatedOneCPKSKTwoSubscription>;
