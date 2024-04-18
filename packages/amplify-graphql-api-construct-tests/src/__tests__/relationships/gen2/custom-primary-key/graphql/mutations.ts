/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from './API';
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createPrimaryCPKSKFour = /* GraphQL */ `mutation CreatePrimaryCPKSKFour(
  $condition: ModelPrimaryCPKSKFourConditionInput
  $input: CreatePrimaryCPKSKFourInput!
) {
  createPrimaryCPKSKFour(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreatePrimaryCPKSKFourMutationVariables, APITypes.CreatePrimaryCPKSKFourMutation>;
export const createPrimaryCPKSKOne = /* GraphQL */ `mutation CreatePrimaryCPKSKOne(
  $condition: ModelPrimaryCPKSKOneConditionInput
  $input: CreatePrimaryCPKSKOneInput!
) {
  createPrimaryCPKSKOne(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreatePrimaryCPKSKOneMutationVariables, APITypes.CreatePrimaryCPKSKOneMutation>;
export const createPrimaryCPKSKThree = /* GraphQL */ `mutation CreatePrimaryCPKSKThree(
  $condition: ModelPrimaryCPKSKThreeConditionInput
  $input: CreatePrimaryCPKSKThreeInput!
) {
  createPrimaryCPKSKThree(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreatePrimaryCPKSKThreeMutationVariables, APITypes.CreatePrimaryCPKSKThreeMutation>;
export const createPrimaryCPKSKTwo = /* GraphQL */ `mutation CreatePrimaryCPKSKTwo(
  $condition: ModelPrimaryCPKSKTwoConditionInput
  $input: CreatePrimaryCPKSKTwoInput!
) {
  createPrimaryCPKSKTwo(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreatePrimaryCPKSKTwoMutationVariables, APITypes.CreatePrimaryCPKSKTwoMutation>;
export const createRelatedManyCPKSKFour = /* GraphQL */ `mutation CreateRelatedManyCPKSKFour(
  $condition: ModelRelatedManyCPKSKFourConditionInput
  $input: CreateRelatedManyCPKSKFourInput!
) {
  createRelatedManyCPKSKFour(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateRelatedManyCPKSKFourMutationVariables, APITypes.CreateRelatedManyCPKSKFourMutation>;
export const createRelatedManyCPKSKOne = /* GraphQL */ `mutation CreateRelatedManyCPKSKOne(
  $condition: ModelRelatedManyCPKSKOneConditionInput
  $input: CreateRelatedManyCPKSKOneInput!
) {
  createRelatedManyCPKSKOne(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateRelatedManyCPKSKOneMutationVariables, APITypes.CreateRelatedManyCPKSKOneMutation>;
export const createRelatedManyCPKSKThree = /* GraphQL */ `mutation CreateRelatedManyCPKSKThree(
  $condition: ModelRelatedManyCPKSKThreeConditionInput
  $input: CreateRelatedManyCPKSKThreeInput!
) {
  createRelatedManyCPKSKThree(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateRelatedManyCPKSKThreeMutationVariables, APITypes.CreateRelatedManyCPKSKThreeMutation>;
export const createRelatedManyCPKSKTwo = /* GraphQL */ `mutation CreateRelatedManyCPKSKTwo(
  $condition: ModelRelatedManyCPKSKTwoConditionInput
  $input: CreateRelatedManyCPKSKTwoInput!
) {
  createRelatedManyCPKSKTwo(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateRelatedManyCPKSKTwoMutationVariables, APITypes.CreateRelatedManyCPKSKTwoMutation>;
export const createRelatedOneCPKSKFour = /* GraphQL */ `mutation CreateRelatedOneCPKSKFour(
  $condition: ModelRelatedOneCPKSKFourConditionInput
  $input: CreateRelatedOneCPKSKFourInput!
) {
  createRelatedOneCPKSKFour(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateRelatedOneCPKSKFourMutationVariables, APITypes.CreateRelatedOneCPKSKFourMutation>;
export const createRelatedOneCPKSKOne = /* GraphQL */ `mutation CreateRelatedOneCPKSKOne(
  $condition: ModelRelatedOneCPKSKOneConditionInput
  $input: CreateRelatedOneCPKSKOneInput!
) {
  createRelatedOneCPKSKOne(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateRelatedOneCPKSKOneMutationVariables, APITypes.CreateRelatedOneCPKSKOneMutation>;
export const createRelatedOneCPKSKThree = /* GraphQL */ `mutation CreateRelatedOneCPKSKThree(
  $condition: ModelRelatedOneCPKSKThreeConditionInput
  $input: CreateRelatedOneCPKSKThreeInput!
) {
  createRelatedOneCPKSKThree(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateRelatedOneCPKSKThreeMutationVariables, APITypes.CreateRelatedOneCPKSKThreeMutation>;
export const createRelatedOneCPKSKTwo = /* GraphQL */ `mutation CreateRelatedOneCPKSKTwo(
  $condition: ModelRelatedOneCPKSKTwoConditionInput
  $input: CreateRelatedOneCPKSKTwoInput!
) {
  createRelatedOneCPKSKTwo(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.CreateRelatedOneCPKSKTwoMutationVariables, APITypes.CreateRelatedOneCPKSKTwoMutation>;
export const deletePrimaryCPKSKFour = /* GraphQL */ `mutation DeletePrimaryCPKSKFour(
  $condition: ModelPrimaryCPKSKFourConditionInput
  $input: DeletePrimaryCPKSKFourInput!
) {
  deletePrimaryCPKSKFour(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeletePrimaryCPKSKFourMutationVariables, APITypes.DeletePrimaryCPKSKFourMutation>;
export const deletePrimaryCPKSKOne = /* GraphQL */ `mutation DeletePrimaryCPKSKOne(
  $condition: ModelPrimaryCPKSKOneConditionInput
  $input: DeletePrimaryCPKSKOneInput!
) {
  deletePrimaryCPKSKOne(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeletePrimaryCPKSKOneMutationVariables, APITypes.DeletePrimaryCPKSKOneMutation>;
export const deletePrimaryCPKSKThree = /* GraphQL */ `mutation DeletePrimaryCPKSKThree(
  $condition: ModelPrimaryCPKSKThreeConditionInput
  $input: DeletePrimaryCPKSKThreeInput!
) {
  deletePrimaryCPKSKThree(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeletePrimaryCPKSKThreeMutationVariables, APITypes.DeletePrimaryCPKSKThreeMutation>;
export const deletePrimaryCPKSKTwo = /* GraphQL */ `mutation DeletePrimaryCPKSKTwo(
  $condition: ModelPrimaryCPKSKTwoConditionInput
  $input: DeletePrimaryCPKSKTwoInput!
) {
  deletePrimaryCPKSKTwo(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeletePrimaryCPKSKTwoMutationVariables, APITypes.DeletePrimaryCPKSKTwoMutation>;
export const deleteRelatedManyCPKSKFour = /* GraphQL */ `mutation DeleteRelatedManyCPKSKFour(
  $condition: ModelRelatedManyCPKSKFourConditionInput
  $input: DeleteRelatedManyCPKSKFourInput!
) {
  deleteRelatedManyCPKSKFour(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeleteRelatedManyCPKSKFourMutationVariables, APITypes.DeleteRelatedManyCPKSKFourMutation>;
export const deleteRelatedManyCPKSKOne = /* GraphQL */ `mutation DeleteRelatedManyCPKSKOne(
  $condition: ModelRelatedManyCPKSKOneConditionInput
  $input: DeleteRelatedManyCPKSKOneInput!
) {
  deleteRelatedManyCPKSKOne(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeleteRelatedManyCPKSKOneMutationVariables, APITypes.DeleteRelatedManyCPKSKOneMutation>;
export const deleteRelatedManyCPKSKThree = /* GraphQL */ `mutation DeleteRelatedManyCPKSKThree(
  $condition: ModelRelatedManyCPKSKThreeConditionInput
  $input: DeleteRelatedManyCPKSKThreeInput!
) {
  deleteRelatedManyCPKSKThree(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeleteRelatedManyCPKSKThreeMutationVariables, APITypes.DeleteRelatedManyCPKSKThreeMutation>;
export const deleteRelatedManyCPKSKTwo = /* GraphQL */ `mutation DeleteRelatedManyCPKSKTwo(
  $condition: ModelRelatedManyCPKSKTwoConditionInput
  $input: DeleteRelatedManyCPKSKTwoInput!
) {
  deleteRelatedManyCPKSKTwo(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeleteRelatedManyCPKSKTwoMutationVariables, APITypes.DeleteRelatedManyCPKSKTwoMutation>;
export const deleteRelatedOneCPKSKFour = /* GraphQL */ `mutation DeleteRelatedOneCPKSKFour(
  $condition: ModelRelatedOneCPKSKFourConditionInput
  $input: DeleteRelatedOneCPKSKFourInput!
) {
  deleteRelatedOneCPKSKFour(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeleteRelatedOneCPKSKFourMutationVariables, APITypes.DeleteRelatedOneCPKSKFourMutation>;
export const deleteRelatedOneCPKSKOne = /* GraphQL */ `mutation DeleteRelatedOneCPKSKOne(
  $condition: ModelRelatedOneCPKSKOneConditionInput
  $input: DeleteRelatedOneCPKSKOneInput!
) {
  deleteRelatedOneCPKSKOne(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeleteRelatedOneCPKSKOneMutationVariables, APITypes.DeleteRelatedOneCPKSKOneMutation>;
export const deleteRelatedOneCPKSKThree = /* GraphQL */ `mutation DeleteRelatedOneCPKSKThree(
  $condition: ModelRelatedOneCPKSKThreeConditionInput
  $input: DeleteRelatedOneCPKSKThreeInput!
) {
  deleteRelatedOneCPKSKThree(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeleteRelatedOneCPKSKThreeMutationVariables, APITypes.DeleteRelatedOneCPKSKThreeMutation>;
export const deleteRelatedOneCPKSKTwo = /* GraphQL */ `mutation DeleteRelatedOneCPKSKTwo(
  $condition: ModelRelatedOneCPKSKTwoConditionInput
  $input: DeleteRelatedOneCPKSKTwoInput!
) {
  deleteRelatedOneCPKSKTwo(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.DeleteRelatedOneCPKSKTwoMutationVariables, APITypes.DeleteRelatedOneCPKSKTwoMutation>;
export const updatePrimaryCPKSKFour = /* GraphQL */ `mutation UpdatePrimaryCPKSKFour(
  $condition: ModelPrimaryCPKSKFourConditionInput
  $input: UpdatePrimaryCPKSKFourInput!
) {
  updatePrimaryCPKSKFour(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdatePrimaryCPKSKFourMutationVariables, APITypes.UpdatePrimaryCPKSKFourMutation>;
export const updatePrimaryCPKSKOne = /* GraphQL */ `mutation UpdatePrimaryCPKSKOne(
  $condition: ModelPrimaryCPKSKOneConditionInput
  $input: UpdatePrimaryCPKSKOneInput!
) {
  updatePrimaryCPKSKOne(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdatePrimaryCPKSKOneMutationVariables, APITypes.UpdatePrimaryCPKSKOneMutation>;
export const updatePrimaryCPKSKThree = /* GraphQL */ `mutation UpdatePrimaryCPKSKThree(
  $condition: ModelPrimaryCPKSKThreeConditionInput
  $input: UpdatePrimaryCPKSKThreeInput!
) {
  updatePrimaryCPKSKThree(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdatePrimaryCPKSKThreeMutationVariables, APITypes.UpdatePrimaryCPKSKThreeMutation>;
export const updatePrimaryCPKSKTwo = /* GraphQL */ `mutation UpdatePrimaryCPKSKTwo(
  $condition: ModelPrimaryCPKSKTwoConditionInput
  $input: UpdatePrimaryCPKSKTwoInput!
) {
  updatePrimaryCPKSKTwo(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdatePrimaryCPKSKTwoMutationVariables, APITypes.UpdatePrimaryCPKSKTwoMutation>;
export const updateRelatedManyCPKSKFour = /* GraphQL */ `mutation UpdateRelatedManyCPKSKFour(
  $condition: ModelRelatedManyCPKSKFourConditionInput
  $input: UpdateRelatedManyCPKSKFourInput!
) {
  updateRelatedManyCPKSKFour(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdateRelatedManyCPKSKFourMutationVariables, APITypes.UpdateRelatedManyCPKSKFourMutation>;
export const updateRelatedManyCPKSKOne = /* GraphQL */ `mutation UpdateRelatedManyCPKSKOne(
  $condition: ModelRelatedManyCPKSKOneConditionInput
  $input: UpdateRelatedManyCPKSKOneInput!
) {
  updateRelatedManyCPKSKOne(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdateRelatedManyCPKSKOneMutationVariables, APITypes.UpdateRelatedManyCPKSKOneMutation>;
export const updateRelatedManyCPKSKThree = /* GraphQL */ `mutation UpdateRelatedManyCPKSKThree(
  $condition: ModelRelatedManyCPKSKThreeConditionInput
  $input: UpdateRelatedManyCPKSKThreeInput!
) {
  updateRelatedManyCPKSKThree(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdateRelatedManyCPKSKThreeMutationVariables, APITypes.UpdateRelatedManyCPKSKThreeMutation>;
export const updateRelatedManyCPKSKTwo = /* GraphQL */ `mutation UpdateRelatedManyCPKSKTwo(
  $condition: ModelRelatedManyCPKSKTwoConditionInput
  $input: UpdateRelatedManyCPKSKTwoInput!
) {
  updateRelatedManyCPKSKTwo(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdateRelatedManyCPKSKTwoMutationVariables, APITypes.UpdateRelatedManyCPKSKTwoMutation>;
export const updateRelatedOneCPKSKFour = /* GraphQL */ `mutation UpdateRelatedOneCPKSKFour(
  $condition: ModelRelatedOneCPKSKFourConditionInput
  $input: UpdateRelatedOneCPKSKFourInput!
) {
  updateRelatedOneCPKSKFour(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdateRelatedOneCPKSKFourMutationVariables, APITypes.UpdateRelatedOneCPKSKFourMutation>;
export const updateRelatedOneCPKSKOne = /* GraphQL */ `mutation UpdateRelatedOneCPKSKOne(
  $condition: ModelRelatedOneCPKSKOneConditionInput
  $input: UpdateRelatedOneCPKSKOneInput!
) {
  updateRelatedOneCPKSKOne(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdateRelatedOneCPKSKOneMutationVariables, APITypes.UpdateRelatedOneCPKSKOneMutation>;
export const updateRelatedOneCPKSKThree = /* GraphQL */ `mutation UpdateRelatedOneCPKSKThree(
  $condition: ModelRelatedOneCPKSKThreeConditionInput
  $input: UpdateRelatedOneCPKSKThreeInput!
) {
  updateRelatedOneCPKSKThree(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdateRelatedOneCPKSKThreeMutationVariables, APITypes.UpdateRelatedOneCPKSKThreeMutation>;
export const updateRelatedOneCPKSKTwo = /* GraphQL */ `mutation UpdateRelatedOneCPKSKTwo(
  $condition: ModelRelatedOneCPKSKTwoConditionInput
  $input: UpdateRelatedOneCPKSKTwoInput!
) {
  updateRelatedOneCPKSKTwo(condition: $condition, input: $input) {
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
` as GeneratedMutation<APITypes.UpdateRelatedOneCPKSKTwoMutationVariables, APITypes.UpdateRelatedOneCPKSKTwoMutation>;
