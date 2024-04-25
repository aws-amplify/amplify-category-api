/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createPrimary = /* GraphQL */ `mutation CreatePrimary(
  $condition: ModelPrimaryConditionInput
  $input: CreatePrimaryInput!
) {
  createPrimary(condition: $condition, input: $input) {
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
      updatedAt
      __typename
    }
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreatePrimaryMutationVariables,
  APITypes.CreatePrimaryMutation
>;
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
` as GeneratedMutation<
  APITypes.CreatePrimaryCPKSKOneMutationVariables,
  APITypes.CreatePrimaryCPKSKOneMutation
>;
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
` as GeneratedMutation<
  APITypes.CreatePrimaryCPKSKTwoMutationVariables,
  APITypes.CreatePrimaryCPKSKTwoMutation
>;
export const createRelatedMany = /* GraphQL */ `mutation CreateRelatedMany(
  $condition: ModelRelatedManyConditionInput
  $input: CreateRelatedManyInput!
) {
  createRelatedMany(condition: $condition, input: $input) {
    createdAt
    id
    primary {
      createdAt
      id
      updatedAt
      __typename
    }
    primaryId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateRelatedManyMutationVariables,
  APITypes.CreateRelatedManyMutation
>;
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
` as GeneratedMutation<
  APITypes.CreateRelatedManyCPKSKOneMutationVariables,
  APITypes.CreateRelatedManyCPKSKOneMutation
>;
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
` as GeneratedMutation<
  APITypes.CreateRelatedManyCPKSKTwoMutationVariables,
  APITypes.CreateRelatedManyCPKSKTwoMutation
>;
export const createRelatedOne = /* GraphQL */ `mutation CreateRelatedOne(
  $condition: ModelRelatedOneConditionInput
  $input: CreateRelatedOneInput!
) {
  createRelatedOne(condition: $condition, input: $input) {
    createdAt
    id
    primary {
      createdAt
      id
      updatedAt
      __typename
    }
    primaryId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateRelatedOneMutationVariables,
  APITypes.CreateRelatedOneMutation
>;
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
` as GeneratedMutation<
  APITypes.CreateRelatedOneCPKSKOneMutationVariables,
  APITypes.CreateRelatedOneCPKSKOneMutation
>;
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
` as GeneratedMutation<
  APITypes.CreateRelatedOneCPKSKTwoMutationVariables,
  APITypes.CreateRelatedOneCPKSKTwoMutation
>;
export const deletePrimary = /* GraphQL */ `mutation DeletePrimary(
  $condition: ModelPrimaryConditionInput
  $input: DeletePrimaryInput!
) {
  deletePrimary(condition: $condition, input: $input) {
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
      updatedAt
      __typename
    }
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeletePrimaryMutationVariables,
  APITypes.DeletePrimaryMutation
>;
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
` as GeneratedMutation<
  APITypes.DeletePrimaryCPKSKOneMutationVariables,
  APITypes.DeletePrimaryCPKSKOneMutation
>;
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
` as GeneratedMutation<
  APITypes.DeletePrimaryCPKSKTwoMutationVariables,
  APITypes.DeletePrimaryCPKSKTwoMutation
>;
export const deleteRelatedMany = /* GraphQL */ `mutation DeleteRelatedMany(
  $condition: ModelRelatedManyConditionInput
  $input: DeleteRelatedManyInput!
) {
  deleteRelatedMany(condition: $condition, input: $input) {
    createdAt
    id
    primary {
      createdAt
      id
      updatedAt
      __typename
    }
    primaryId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteRelatedManyMutationVariables,
  APITypes.DeleteRelatedManyMutation
>;
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
` as GeneratedMutation<
  APITypes.DeleteRelatedManyCPKSKOneMutationVariables,
  APITypes.DeleteRelatedManyCPKSKOneMutation
>;
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
` as GeneratedMutation<
  APITypes.DeleteRelatedManyCPKSKTwoMutationVariables,
  APITypes.DeleteRelatedManyCPKSKTwoMutation
>;
export const deleteRelatedOne = /* GraphQL */ `mutation DeleteRelatedOne(
  $condition: ModelRelatedOneConditionInput
  $input: DeleteRelatedOneInput!
) {
  deleteRelatedOne(condition: $condition, input: $input) {
    createdAt
    id
    primary {
      createdAt
      id
      updatedAt
      __typename
    }
    primaryId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteRelatedOneMutationVariables,
  APITypes.DeleteRelatedOneMutation
>;
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
` as GeneratedMutation<
  APITypes.DeleteRelatedOneCPKSKOneMutationVariables,
  APITypes.DeleteRelatedOneCPKSKOneMutation
>;
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
` as GeneratedMutation<
  APITypes.DeleteRelatedOneCPKSKTwoMutationVariables,
  APITypes.DeleteRelatedOneCPKSKTwoMutation
>;
export const updatePrimary = /* GraphQL */ `mutation UpdatePrimary(
  $condition: ModelPrimaryConditionInput
  $input: UpdatePrimaryInput!
) {
  updatePrimary(condition: $condition, input: $input) {
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
      updatedAt
      __typename
    }
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdatePrimaryMutationVariables,
  APITypes.UpdatePrimaryMutation
>;
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
` as GeneratedMutation<
  APITypes.UpdatePrimaryCPKSKOneMutationVariables,
  APITypes.UpdatePrimaryCPKSKOneMutation
>;
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
` as GeneratedMutation<
  APITypes.UpdatePrimaryCPKSKTwoMutationVariables,
  APITypes.UpdatePrimaryCPKSKTwoMutation
>;
export const updateRelatedMany = /* GraphQL */ `mutation UpdateRelatedMany(
  $condition: ModelRelatedManyConditionInput
  $input: UpdateRelatedManyInput!
) {
  updateRelatedMany(condition: $condition, input: $input) {
    createdAt
    id
    primary {
      createdAt
      id
      updatedAt
      __typename
    }
    primaryId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateRelatedManyMutationVariables,
  APITypes.UpdateRelatedManyMutation
>;
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
` as GeneratedMutation<
  APITypes.UpdateRelatedManyCPKSKOneMutationVariables,
  APITypes.UpdateRelatedManyCPKSKOneMutation
>;
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
` as GeneratedMutation<
  APITypes.UpdateRelatedManyCPKSKTwoMutationVariables,
  APITypes.UpdateRelatedManyCPKSKTwoMutation
>;
export const updateRelatedOne = /* GraphQL */ `mutation UpdateRelatedOne(
  $condition: ModelRelatedOneConditionInput
  $input: UpdateRelatedOneInput!
) {
  updateRelatedOne(condition: $condition, input: $input) {
    createdAt
    id
    primary {
      createdAt
      id
      updatedAt
      __typename
    }
    primaryId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateRelatedOneMutationVariables,
  APITypes.UpdateRelatedOneMutation
>;
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
` as GeneratedMutation<
  APITypes.UpdateRelatedOneCPKSKOneMutationVariables,
  APITypes.UpdateRelatedOneCPKSKOneMutation
>;
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
` as GeneratedMutation<
  APITypes.UpdateRelatedOneCPKSKTwoMutationVariables,
  APITypes.UpdateRelatedOneCPKSKTwoMutation
>;
