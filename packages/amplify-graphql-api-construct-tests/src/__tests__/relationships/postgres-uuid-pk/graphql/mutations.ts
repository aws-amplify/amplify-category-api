/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from './API';
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createPrimary = /* GraphQL */ `mutation CreatePrimary(
  $condition: ModelPrimaryConditionInput
  $input: CreatePrimaryInput!
) {
  createPrimary(condition: $condition, input: $input) {
    id
    relatedMany {
      nextToken
      items {
        id
        primaryId
      }
    }
    relatedOne {
      id
      primaryId
    }
  }
}
` as GeneratedMutation<APITypes.CreatePrimaryMutationVariables, APITypes.CreatePrimaryMutation>;
export const createRelatedMany = /* GraphQL */ `mutation CreateRelatedMany(
  $condition: ModelRelatedManyConditionInput
  $input: CreateRelatedManyInput!
) {
  createRelatedMany(condition: $condition, input: $input) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedMutation<APITypes.CreateRelatedManyMutationVariables, APITypes.CreateRelatedManyMutation>;
export const createRelatedOne = /* GraphQL */ `mutation CreateRelatedOne(
  $condition: ModelRelatedOneConditionInput
  $input: CreateRelatedOneInput!
) {
  createRelatedOne(condition: $condition, input: $input) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedMutation<APITypes.CreateRelatedOneMutationVariables, APITypes.CreateRelatedOneMutation>;
export const deletePrimary = /* GraphQL */ `mutation DeletePrimary(
  $condition: ModelPrimaryConditionInput
  $input: DeletePrimaryInput!
) {
  deletePrimary(condition: $condition, input: $input) {
    id
    relatedMany {
      nextToken
      items {
        id
        primaryId
      }
    }
    relatedOne {
      id
      primaryId
    }
  }
}
` as GeneratedMutation<APITypes.DeletePrimaryMutationVariables, APITypes.DeletePrimaryMutation>;
export const deleteRelatedMany = /* GraphQL */ `mutation DeleteRelatedMany(
  $condition: ModelRelatedManyConditionInput
  $input: DeleteRelatedManyInput!
) {
  deleteRelatedMany(condition: $condition, input: $input) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedMutation<APITypes.DeleteRelatedManyMutationVariables, APITypes.DeleteRelatedManyMutation>;
export const deleteRelatedOne = /* GraphQL */ `mutation DeleteRelatedOne(
  $condition: ModelRelatedOneConditionInput
  $input: DeleteRelatedOneInput!
) {
  deleteRelatedOne(condition: $condition, input: $input) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedMutation<APITypes.DeleteRelatedOneMutationVariables, APITypes.DeleteRelatedOneMutation>;
export const updatePrimary = /* GraphQL */ `mutation UpdatePrimary(
  $condition: ModelPrimaryConditionInput
  $input: UpdatePrimaryInput!
) {
  updatePrimary(condition: $condition, input: $input) {
    id
    relatedMany {
      nextToken
      items {
        id
        primaryId
      }
    }
    relatedOne {
      id
      primaryId
    }
  }
}
` as GeneratedMutation<APITypes.UpdatePrimaryMutationVariables, APITypes.UpdatePrimaryMutation>;
export const updateRelatedMany = /* GraphQL */ `mutation UpdateRelatedMany(
  $condition: ModelRelatedManyConditionInput
  $input: UpdateRelatedManyInput!
) {
  updateRelatedMany(condition: $condition, input: $input) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedMutation<APITypes.UpdateRelatedManyMutationVariables, APITypes.UpdateRelatedManyMutation>;
export const updateRelatedOne = /* GraphQL */ `mutation UpdateRelatedOne(
  $condition: ModelRelatedOneConditionInput
  $input: UpdateRelatedOneInput!
) {
  updateRelatedOne(condition: $condition, input: $input) {
    id
    primary {
      id
    }
    primaryId
  }
}
` as GeneratedMutation<APITypes.UpdateRelatedOneMutationVariables, APITypes.UpdateRelatedOneMutation>;
