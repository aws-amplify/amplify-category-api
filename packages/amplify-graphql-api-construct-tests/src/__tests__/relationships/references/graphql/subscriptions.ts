/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from '../API';
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreatePrimary = /* GraphQL */ `subscription OnCreatePrimary($filter: ModelSubscriptionPrimaryFilterInput) {
  onCreatePrimary(filter: $filter) {
    id
    relatedMany {
      nextToken
    }
    relatedOne {
      id
      primaryId
    }
  }
}
` as GeneratedSubscription<APITypes.OnCreatePrimarySubscriptionVariables, APITypes.OnCreatePrimarySubscription>;
export const onCreatePrimaryCPKSKOne = /* GraphQL */ `subscription OnCreatePrimaryCPKSKOne(
  $filter: ModelSubscriptionPrimaryCPKSKOneFilterInput
) {
  onCreatePrimaryCPKSKOne(filter: $filter) {
    id
    relatedMany {
      nextToken
    }
    relatedOne {
      id
      primaryId
      primarySkOne
    }
    skOne
  }
}
` as GeneratedSubscription<APITypes.OnCreatePrimaryCPKSKOneSubscriptionVariables, APITypes.OnCreatePrimaryCPKSKOneSubscription>;
export const onCreatePrimaryCPKSKTwo = /* GraphQL */ `subscription OnCreatePrimaryCPKSKTwo(
  $filter: ModelSubscriptionPrimaryCPKSKTwoFilterInput
) {
  onCreatePrimaryCPKSKTwo(filter: $filter) {
    id
    relatedMany {
      nextToken
    }
    relatedOne {
      id
      primaryId
      primarySkOne
      primarySkTwo
    }
    skOne
    skTwo
  }
}
` as GeneratedSubscription<APITypes.OnCreatePrimaryCPKSKTwoSubscriptionVariables, APITypes.OnCreatePrimaryCPKSKTwoSubscription>;
export const onCreateRelatedMany = /* GraphQL */ `subscription OnCreateRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
) {
  onCreateRelatedMany(filter: $filter) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedSubscription<APITypes.OnCreateRelatedManySubscriptionVariables, APITypes.OnCreateRelatedManySubscription>;
export const onCreateRelatedManyCPKSKOne = /* GraphQL */ `subscription OnCreateRelatedManyCPKSKOne(
  $filter: ModelSubscriptionRelatedManyCPKSKOneFilterInput
) {
  onCreateRelatedManyCPKSKOne(filter: $filter) {
    id
    primary {
      id
      skOne
    }
    primaryId
    primarySkOne
  }
}
` as GeneratedSubscription<APITypes.OnCreateRelatedManyCPKSKOneSubscriptionVariables, APITypes.OnCreateRelatedManyCPKSKOneSubscription>;
export const onCreateRelatedManyCPKSKTwo = /* GraphQL */ `subscription OnCreateRelatedManyCPKSKTwo(
  $filter: ModelSubscriptionRelatedManyCPKSKTwoFilterInput
) {
  onCreateRelatedManyCPKSKTwo(filter: $filter) {
    id
    primary {
      id
      skOne
      skTwo
    }
    primaryId
    primarySkOne
    primarySkTwo
  }
}
` as GeneratedSubscription<APITypes.OnCreateRelatedManyCPKSKTwoSubscriptionVariables, APITypes.OnCreateRelatedManyCPKSKTwoSubscription>;
export const onCreateRelatedOne = /* GraphQL */ `subscription OnCreateRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
) {
  onCreateRelatedOne(filter: $filter) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedSubscription<APITypes.OnCreateRelatedOneSubscriptionVariables, APITypes.OnCreateRelatedOneSubscription>;
export const onCreateRelatedOneCPKSKOne = /* GraphQL */ `subscription OnCreateRelatedOneCPKSKOne(
  $filter: ModelSubscriptionRelatedOneCPKSKOneFilterInput
) {
  onCreateRelatedOneCPKSKOne(filter: $filter) {
    id
    primary {
      id
      skOne
    }
    primaryId
    primarySkOne
  }
}
` as GeneratedSubscription<APITypes.OnCreateRelatedOneCPKSKOneSubscriptionVariables, APITypes.OnCreateRelatedOneCPKSKOneSubscription>;
export const onCreateRelatedOneCPKSKTwo = /* GraphQL */ `subscription OnCreateRelatedOneCPKSKTwo(
  $filter: ModelSubscriptionRelatedOneCPKSKTwoFilterInput
) {
  onCreateRelatedOneCPKSKTwo(filter: $filter) {
    id
    primary {
      id
      skOne
      skTwo
    }
    primaryId
    primarySkOne
    primarySkTwo
  }
}
` as GeneratedSubscription<APITypes.OnCreateRelatedOneCPKSKTwoSubscriptionVariables, APITypes.OnCreateRelatedOneCPKSKTwoSubscription>;
export const onDeletePrimary = /* GraphQL */ `subscription OnDeletePrimary($filter: ModelSubscriptionPrimaryFilterInput) {
  onDeletePrimary(filter: $filter) {
    id
    relatedMany {
      nextToken
    }
    relatedOne {
      id
      primaryId
    }
  }
}
` as GeneratedSubscription<APITypes.OnDeletePrimarySubscriptionVariables, APITypes.OnDeletePrimarySubscription>;
export const onDeletePrimaryCPKSKOne = /* GraphQL */ `subscription OnDeletePrimaryCPKSKOne(
  $filter: ModelSubscriptionPrimaryCPKSKOneFilterInput
) {
  onDeletePrimaryCPKSKOne(filter: $filter) {
    id
    relatedMany {
      nextToken
    }
    relatedOne {
      id
      primaryId
      primarySkOne
    }
    skOne
  }
}
` as GeneratedSubscription<APITypes.OnDeletePrimaryCPKSKOneSubscriptionVariables, APITypes.OnDeletePrimaryCPKSKOneSubscription>;
export const onDeletePrimaryCPKSKTwo = /* GraphQL */ `subscription OnDeletePrimaryCPKSKTwo(
  $filter: ModelSubscriptionPrimaryCPKSKTwoFilterInput
) {
  onDeletePrimaryCPKSKTwo(filter: $filter) {
    id
    relatedMany {
      nextToken
    }
    relatedOne {
      id
      primaryId
      primarySkOne
      primarySkTwo
    }
    skOne
    skTwo
  }
}
` as GeneratedSubscription<APITypes.OnDeletePrimaryCPKSKTwoSubscriptionVariables, APITypes.OnDeletePrimaryCPKSKTwoSubscription>;
export const onDeleteRelatedMany = /* GraphQL */ `subscription OnDeleteRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
) {
  onDeleteRelatedMany(filter: $filter) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedSubscription<APITypes.OnDeleteRelatedManySubscriptionVariables, APITypes.OnDeleteRelatedManySubscription>;
export const onDeleteRelatedManyCPKSKOne = /* GraphQL */ `subscription OnDeleteRelatedManyCPKSKOne(
  $filter: ModelSubscriptionRelatedManyCPKSKOneFilterInput
) {
  onDeleteRelatedManyCPKSKOne(filter: $filter) {
    id
    primary {
      id
      skOne
    }
    primaryId
    primarySkOne
  }
}
` as GeneratedSubscription<APITypes.OnDeleteRelatedManyCPKSKOneSubscriptionVariables, APITypes.OnDeleteRelatedManyCPKSKOneSubscription>;
export const onDeleteRelatedManyCPKSKTwo = /* GraphQL */ `subscription OnDeleteRelatedManyCPKSKTwo(
  $filter: ModelSubscriptionRelatedManyCPKSKTwoFilterInput
) {
  onDeleteRelatedManyCPKSKTwo(filter: $filter) {
    id
    primary {
      id
      skOne
      skTwo
    }
    primaryId
    primarySkOne
    primarySkTwo
  }
}
` as GeneratedSubscription<APITypes.OnDeleteRelatedManyCPKSKTwoSubscriptionVariables, APITypes.OnDeleteRelatedManyCPKSKTwoSubscription>;
export const onDeleteRelatedOne = /* GraphQL */ `subscription OnDeleteRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
) {
  onDeleteRelatedOne(filter: $filter) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedSubscription<APITypes.OnDeleteRelatedOneSubscriptionVariables, APITypes.OnDeleteRelatedOneSubscription>;
export const onDeleteRelatedOneCPKSKOne = /* GraphQL */ `subscription OnDeleteRelatedOneCPKSKOne(
  $filter: ModelSubscriptionRelatedOneCPKSKOneFilterInput
) {
  onDeleteRelatedOneCPKSKOne(filter: $filter) {
    id
    primary {
      id
      skOne
    }
    primaryId
    primarySkOne
  }
}
` as GeneratedSubscription<APITypes.OnDeleteRelatedOneCPKSKOneSubscriptionVariables, APITypes.OnDeleteRelatedOneCPKSKOneSubscription>;
export const onDeleteRelatedOneCPKSKTwo = /* GraphQL */ `subscription OnDeleteRelatedOneCPKSKTwo(
  $filter: ModelSubscriptionRelatedOneCPKSKTwoFilterInput
) {
  onDeleteRelatedOneCPKSKTwo(filter: $filter) {
    id
    primary {
      id
      skOne
      skTwo
    }
    primaryId
    primarySkOne
    primarySkTwo
  }
}
` as GeneratedSubscription<APITypes.OnDeleteRelatedOneCPKSKTwoSubscriptionVariables, APITypes.OnDeleteRelatedOneCPKSKTwoSubscription>;
export const onUpdatePrimary = /* GraphQL */ `subscription OnUpdatePrimary($filter: ModelSubscriptionPrimaryFilterInput) {
  onUpdatePrimary(filter: $filter) {
    id
    relatedMany {
      nextToken
    }
    relatedOne {
      id
      primaryId
    }
  }
}
` as GeneratedSubscription<APITypes.OnUpdatePrimarySubscriptionVariables, APITypes.OnUpdatePrimarySubscription>;
export const onUpdatePrimaryCPKSKOne = /* GraphQL */ `subscription OnUpdatePrimaryCPKSKOne(
  $filter: ModelSubscriptionPrimaryCPKSKOneFilterInput
) {
  onUpdatePrimaryCPKSKOne(filter: $filter) {
    id
    relatedMany {
      nextToken
    }
    relatedOne {
      id
      primaryId
      primarySkOne
    }
    skOne
  }
}
` as GeneratedSubscription<APITypes.OnUpdatePrimaryCPKSKOneSubscriptionVariables, APITypes.OnUpdatePrimaryCPKSKOneSubscription>;
export const onUpdatePrimaryCPKSKTwo = /* GraphQL */ `subscription OnUpdatePrimaryCPKSKTwo(
  $filter: ModelSubscriptionPrimaryCPKSKTwoFilterInput
) {
  onUpdatePrimaryCPKSKTwo(filter: $filter) {
    id
    relatedMany {
      nextToken
    }
    relatedOne {
      id
      primaryId
      primarySkOne
      primarySkTwo
    }
    skOne
    skTwo
  }
}
` as GeneratedSubscription<APITypes.OnUpdatePrimaryCPKSKTwoSubscriptionVariables, APITypes.OnUpdatePrimaryCPKSKTwoSubscription>;
export const onUpdateRelatedMany = /* GraphQL */ `subscription OnUpdateRelatedMany(
  $filter: ModelSubscriptionRelatedManyFilterInput
) {
  onUpdateRelatedMany(filter: $filter) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedSubscription<APITypes.OnUpdateRelatedManySubscriptionVariables, APITypes.OnUpdateRelatedManySubscription>;
export const onUpdateRelatedManyCPKSKOne = /* GraphQL */ `subscription OnUpdateRelatedManyCPKSKOne(
  $filter: ModelSubscriptionRelatedManyCPKSKOneFilterInput
) {
  onUpdateRelatedManyCPKSKOne(filter: $filter) {
    id
    primary {
      id
      skOne
    }
    primaryId
    primarySkOne
  }
}
` as GeneratedSubscription<APITypes.OnUpdateRelatedManyCPKSKOneSubscriptionVariables, APITypes.OnUpdateRelatedManyCPKSKOneSubscription>;
export const onUpdateRelatedManyCPKSKTwo = /* GraphQL */ `subscription OnUpdateRelatedManyCPKSKTwo(
  $filter: ModelSubscriptionRelatedManyCPKSKTwoFilterInput
) {
  onUpdateRelatedManyCPKSKTwo(filter: $filter) {
    id
    primary {
      id
      skOne
      skTwo
    }
    primaryId
    primarySkOne
    primarySkTwo
  }
}
` as GeneratedSubscription<APITypes.OnUpdateRelatedManyCPKSKTwoSubscriptionVariables, APITypes.OnUpdateRelatedManyCPKSKTwoSubscription>;
export const onUpdateRelatedOne = /* GraphQL */ `subscription OnUpdateRelatedOne(
  $filter: ModelSubscriptionRelatedOneFilterInput
) {
  onUpdateRelatedOne(filter: $filter) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedSubscription<APITypes.OnUpdateRelatedOneSubscriptionVariables, APITypes.OnUpdateRelatedOneSubscription>;
export const onUpdateRelatedOneCPKSKOne = /* GraphQL */ `subscription OnUpdateRelatedOneCPKSKOne(
  $filter: ModelSubscriptionRelatedOneCPKSKOneFilterInput
) {
  onUpdateRelatedOneCPKSKOne(filter: $filter) {
    id
    primary {
      id
      skOne
    }
    primaryId
    primarySkOne
  }
}
` as GeneratedSubscription<APITypes.OnUpdateRelatedOneCPKSKOneSubscriptionVariables, APITypes.OnUpdateRelatedOneCPKSKOneSubscription>;
export const onUpdateRelatedOneCPKSKTwo = /* GraphQL */ `subscription OnUpdateRelatedOneCPKSKTwo(
  $filter: ModelSubscriptionRelatedOneCPKSKTwoFilterInput
) {
  onUpdateRelatedOneCPKSKTwo(filter: $filter) {
    id
    primary {
      id
      skOne
      skTwo
    }
    primaryId
    primarySkOne
    primarySkTwo
  }
}
` as GeneratedSubscription<APITypes.OnUpdateRelatedOneCPKSKTwoSubscriptionVariables, APITypes.OnUpdateRelatedOneCPKSKTwoSubscription>;
