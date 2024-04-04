/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
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
` as GeneratedMutation<
  APITypes.CreatePrimaryMutationVariables,
  APITypes.CreatePrimaryMutation
>;
export const updatePrimary = /* GraphQL */ `mutation UpdatePrimary(
  $input: UpdatePrimaryInput!
  $condition: ModelPrimaryConditionInput
) {
  updatePrimary(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdatePrimaryMutationVariables,
  APITypes.UpdatePrimaryMutation
>;
export const deletePrimary = /* GraphQL */ `mutation DeletePrimary(
  $input: DeletePrimaryInput!
  $condition: ModelPrimaryConditionInput
) {
  deletePrimary(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeletePrimaryMutationVariables,
  APITypes.DeletePrimaryMutation
>;
export const createRelatedMany = /* GraphQL */ `mutation CreateRelatedMany(
  $input: CreateRelatedManyInput!
  $condition: ModelRelatedManyConditionInput
) {
  createRelatedMany(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateRelatedManyMutationVariables,
  APITypes.CreateRelatedManyMutation
>;
export const updateRelatedMany = /* GraphQL */ `mutation UpdateRelatedMany(
  $input: UpdateRelatedManyInput!
  $condition: ModelRelatedManyConditionInput
) {
  updateRelatedMany(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateRelatedManyMutationVariables,
  APITypes.UpdateRelatedManyMutation
>;
export const deleteRelatedMany = /* GraphQL */ `mutation DeleteRelatedMany(
  $input: DeleteRelatedManyInput!
  $condition: ModelRelatedManyConditionInput
) {
  deleteRelatedMany(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteRelatedManyMutationVariables,
  APITypes.DeleteRelatedManyMutation
>;
export const createRelatedOne = /* GraphQL */ `mutation CreateRelatedOne(
  $input: CreateRelatedOneInput!
  $condition: ModelRelatedOneConditionInput
) {
  createRelatedOne(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateRelatedOneMutationVariables,
  APITypes.CreateRelatedOneMutation
>;
export const updateRelatedOne = /* GraphQL */ `mutation UpdateRelatedOne(
  $input: UpdateRelatedOneInput!
  $condition: ModelRelatedOneConditionInput
) {
  updateRelatedOne(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateRelatedOneMutationVariables,
  APITypes.UpdateRelatedOneMutation
>;
export const deleteRelatedOne = /* GraphQL */ `mutation DeleteRelatedOne(
  $input: DeleteRelatedOneInput!
  $condition: ModelRelatedOneConditionInput
) {
  deleteRelatedOne(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteRelatedOneMutationVariables,
  APITypes.DeleteRelatedOneMutation
>;
export const createManyLeft = /* GraphQL */ `mutation CreateManyLeft(
  $input: CreateManyLeftInput!
  $condition: ModelManyLeftConditionInput
) {
  createManyLeft(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateManyLeftMutationVariables,
  APITypes.CreateManyLeftMutation
>;
export const updateManyLeft = /* GraphQL */ `mutation UpdateManyLeft(
  $input: UpdateManyLeftInput!
  $condition: ModelManyLeftConditionInput
) {
  updateManyLeft(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateManyLeftMutationVariables,
  APITypes.UpdateManyLeftMutation
>;
export const deleteManyLeft = /* GraphQL */ `mutation DeleteManyLeft(
  $input: DeleteManyLeftInput!
  $condition: ModelManyLeftConditionInput
) {
  deleteManyLeft(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteManyLeftMutationVariables,
  APITypes.DeleteManyLeftMutation
>;
export const createManyRight = /* GraphQL */ `mutation CreateManyRight(
  $input: CreateManyRightInput!
  $condition: ModelManyRightConditionInput
) {
  createManyRight(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateManyRightMutationVariables,
  APITypes.CreateManyRightMutation
>;
export const updateManyRight = /* GraphQL */ `mutation UpdateManyRight(
  $input: UpdateManyRightInput!
  $condition: ModelManyRightConditionInput
) {
  updateManyRight(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateManyRightMutationVariables,
  APITypes.UpdateManyRightMutation
>;
export const deleteManyRight = /* GraphQL */ `mutation DeleteManyRight(
  $input: DeleteManyRightInput!
  $condition: ModelManyRightConditionInput
) {
  deleteManyRight(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteManyRightMutationVariables,
  APITypes.DeleteManyRightMutation
>;
export const createLeftRightJoin = /* GraphQL */ `mutation CreateLeftRightJoin(
  $input: CreateLeftRightJoinInput!
  $condition: ModelLeftRightJoinConditionInput
) {
  createLeftRightJoin(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.CreateLeftRightJoinMutationVariables,
  APITypes.CreateLeftRightJoinMutation
>;
export const updateLeftRightJoin = /* GraphQL */ `mutation UpdateLeftRightJoin(
  $input: UpdateLeftRightJoinInput!
  $condition: ModelLeftRightJoinConditionInput
) {
  updateLeftRightJoin(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.UpdateLeftRightJoinMutationVariables,
  APITypes.UpdateLeftRightJoinMutation
>;
export const deleteLeftRightJoin = /* GraphQL */ `mutation DeleteLeftRightJoin(
  $input: DeleteLeftRightJoinInput!
  $condition: ModelLeftRightJoinConditionInput
) {
  deleteLeftRightJoin(input: $input, condition: $condition) {
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
` as GeneratedMutation<
  APITypes.DeleteLeftRightJoinMutationVariables,
  APITypes.DeleteLeftRightJoinMutation
>;
