/* tslint:disable */
/* eslint-disable */

import * as APITypes from '../API';
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createPrimary = /* GraphQL */ `mutation CreatePrimary(
  $input: CreatePrimaryInput!
  $condition: ModelPrimaryConditionInput
) {
  createPrimary(input: $input, condition: $condition) {
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
` as GeneratedMutation<APITypes.CreatePrimaryMutationVariables, APITypes.CreatePrimaryMutation>;
export const updatePrimary = /* GraphQL */ `mutation UpdatePrimary(
  $input: UpdatePrimaryInput!
  $condition: ModelPrimaryConditionInput
) {
  updatePrimary(input: $input, condition: $condition) {
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
` as GeneratedMutation<APITypes.UpdatePrimaryMutationVariables, APITypes.UpdatePrimaryMutation>;
export const deletePrimary = /* GraphQL */ `mutation DeletePrimary(
  $input: DeletePrimaryInput!
  $condition: ModelPrimaryConditionInput
) {
  deletePrimary(input: $input, condition: $condition) {
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
` as GeneratedMutation<APITypes.DeletePrimaryMutationVariables, APITypes.DeletePrimaryMutation>;
export const createRelatedMany = /* GraphQL */ `mutation CreateRelatedMany(
  $input: CreateRelatedManyInput!
  $condition: ModelRelatedManyConditionInput
) {
  createRelatedMany(input: $input, condition: $condition) {
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
` as GeneratedMutation<APITypes.CreateRelatedManyMutationVariables, APITypes.CreateRelatedManyMutation>;
export const updateRelatedMany = /* GraphQL */ `mutation UpdateRelatedMany(
  $input: UpdateRelatedManyInput!
  $condition: ModelRelatedManyConditionInput
) {
  updateRelatedMany(input: $input, condition: $condition) {
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
` as GeneratedMutation<APITypes.UpdateRelatedManyMutationVariables, APITypes.UpdateRelatedManyMutation>;
export const deleteRelatedMany = /* GraphQL */ `mutation DeleteRelatedMany(
  $input: DeleteRelatedManyInput!
  $condition: ModelRelatedManyConditionInput
) {
  deleteRelatedMany(input: $input, condition: $condition) {
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
` as GeneratedMutation<APITypes.DeleteRelatedManyMutationVariables, APITypes.DeleteRelatedManyMutation>;
export const createRelatedOne = /* GraphQL */ `mutation CreateRelatedOne(
  $input: CreateRelatedOneInput!
  $condition: ModelRelatedOneConditionInput
) {
  createRelatedOne(input: $input, condition: $condition) {
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
` as GeneratedMutation<APITypes.CreateRelatedOneMutationVariables, APITypes.CreateRelatedOneMutation>;
export const updateRelatedOne = /* GraphQL */ `mutation UpdateRelatedOne(
  $input: UpdateRelatedOneInput!
  $condition: ModelRelatedOneConditionInput
) {
  updateRelatedOne(input: $input, condition: $condition) {
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
` as GeneratedMutation<APITypes.UpdateRelatedOneMutationVariables, APITypes.UpdateRelatedOneMutation>;
export const deleteRelatedOne = /* GraphQL */ `mutation DeleteRelatedOne(
  $input: DeleteRelatedOneInput!
  $condition: ModelRelatedOneConditionInput
) {
  deleteRelatedOne(input: $input, condition: $condition) {
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
` as GeneratedMutation<APITypes.DeleteRelatedOneMutationVariables, APITypes.DeleteRelatedOneMutation>;
