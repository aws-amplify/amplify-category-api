/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreatePrimaryInput = {
  id?: string | null,
  secret?: string | null,
  primaryRelatedOneId?: string | null,
};

export type ModelPrimaryConditionInput = {
  secret?: ModelStringInput | null,
  and?: Array< ModelPrimaryConditionInput | null > | null,
  or?: Array< ModelPrimaryConditionInput | null > | null,
  not?: ModelPrimaryConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  primaryRelatedOneId?: ModelIDInput | null,
  owner?: ModelStringInput | null,
};

export type ModelStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
  _null = "_null",
}


export type ModelSizeInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
};

export type ModelIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  size?: ModelSizeInput | null,
};

export type Primary = {
  __typename: "Primary",
  id: string,
  secret?: string | null,
  relatedMany?: ModelRelatedManyConnection | null,
  relatedOne?: RelatedOne | null,
  createdAt: string,
  updatedAt: string,
  primaryRelatedOneId?: string | null,
  owner?: string | null,
};

export type ModelRelatedManyConnection = {
  __typename: "ModelRelatedManyConnection",
  items:  Array<RelatedMany | null >,
  nextToken?: string | null,
};

export type RelatedMany = {
  __typename: "RelatedMany",
  id: string,
  secret?: string | null,
  primary?: Primary | null,
  createdAt: string,
  updatedAt: string,
  primaryRelatedManyId?: string | null,
  owner?: string | null,
};

export type RelatedOne = {
  __typename: "RelatedOne",
  id: string,
  secret?: string | null,
  primary?: Primary | null,
  createdAt: string,
  updatedAt: string,
  relatedOnePrimaryId?: string | null,
  owner?: string | null,
};

export type UpdatePrimaryInput = {
  id: string,
  secret?: string | null,
  primaryRelatedOneId?: string | null,
};

export type DeletePrimaryInput = {
  id: string,
};

export type CreateRelatedManyInput = {
  id?: string | null,
  secret?: string | null,
  primaryRelatedManyId?: string | null,
};

export type ModelRelatedManyConditionInput = {
  secret?: ModelStringInput | null,
  and?: Array< ModelRelatedManyConditionInput | null > | null,
  or?: Array< ModelRelatedManyConditionInput | null > | null,
  not?: ModelRelatedManyConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  primaryRelatedManyId?: ModelIDInput | null,
  owner?: ModelStringInput | null,
};

export type UpdateRelatedManyInput = {
  id: string,
  secret?: string | null,
  primaryRelatedManyId?: string | null,
};

export type DeleteRelatedManyInput = {
  id: string,
};

export type CreateRelatedOneInput = {
  id?: string | null,
  secret?: string | null,
  relatedOnePrimaryId?: string | null,
};

export type ModelRelatedOneConditionInput = {
  secret?: ModelStringInput | null,
  and?: Array< ModelRelatedOneConditionInput | null > | null,
  or?: Array< ModelRelatedOneConditionInput | null > | null,
  not?: ModelRelatedOneConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  relatedOnePrimaryId?: ModelIDInput | null,
  owner?: ModelStringInput | null,
};

export type UpdateRelatedOneInput = {
  id: string,
  secret?: string | null,
  relatedOnePrimaryId?: string | null,
};

export type DeleteRelatedOneInput = {
  id: string,
};

export type CreateManyLeftInput = {
  id?: string | null,
  secret?: string | null,
};

export type ModelManyLeftConditionInput = {
  secret?: ModelStringInput | null,
  and?: Array< ModelManyLeftConditionInput | null > | null,
  or?: Array< ModelManyLeftConditionInput | null > | null,
  not?: ModelManyLeftConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
};

export type ManyLeft = {
  __typename: "ManyLeft",
  id: string,
  secret?: string | null,
  manyRight?: ModelLeftRightJoinConnection | null,
  createdAt: string,
  updatedAt: string,
  owner?: string | null,
};

export type ModelLeftRightJoinConnection = {
  __typename: "ModelLeftRightJoinConnection",
  items:  Array<LeftRightJoin | null >,
  nextToken?: string | null,
};

export type LeftRightJoin = {
  __typename: "LeftRightJoin",
  id: string,
  manyLeftId: string,
  manyRightId: string,
  manyLeft: ManyLeft,
  manyRight: ManyRight,
  createdAt: string,
  updatedAt: string,
  owner?: string | null,
};

export type ManyRight = {
  __typename: "ManyRight",
  id: string,
  secret?: string | null,
  manyLeft?: ModelLeftRightJoinConnection | null,
  createdAt: string,
  updatedAt: string,
  owner?: string | null,
};

export type UpdateManyLeftInput = {
  id: string,
  secret?: string | null,
};

export type DeleteManyLeftInput = {
  id: string,
};

export type CreateManyRightInput = {
  id?: string | null,
  secret?: string | null,
};

export type ModelManyRightConditionInput = {
  secret?: ModelStringInput | null,
  and?: Array< ModelManyRightConditionInput | null > | null,
  or?: Array< ModelManyRightConditionInput | null > | null,
  not?: ModelManyRightConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
};

export type UpdateManyRightInput = {
  id: string,
  secret?: string | null,
};

export type DeleteManyRightInput = {
  id: string,
};

export type CreateLeftRightJoinInput = {
  id?: string | null,
  manyLeftId: string,
  manyRightId: string,
};

export type ModelLeftRightJoinConditionInput = {
  manyLeftId?: ModelIDInput | null,
  manyRightId?: ModelIDInput | null,
  and?: Array< ModelLeftRightJoinConditionInput | null > | null,
  or?: Array< ModelLeftRightJoinConditionInput | null > | null,
  not?: ModelLeftRightJoinConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  owner?: ModelStringInput | null,
};

export type UpdateLeftRightJoinInput = {
  id: string,
  manyLeftId?: string | null,
  manyRightId?: string | null,
};

export type DeleteLeftRightJoinInput = {
  id: string,
};

export type ModelPrimaryFilterInput = {
  id?: ModelIDInput | null,
  secret?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelPrimaryFilterInput | null > | null,
  or?: Array< ModelPrimaryFilterInput | null > | null,
  not?: ModelPrimaryFilterInput | null,
  primaryRelatedOneId?: ModelIDInput | null,
  owner?: ModelStringInput | null,
};

export enum ModelSortDirection {
  ASC = "ASC",
  DESC = "DESC",
}


export type ModelPrimaryConnection = {
  __typename: "ModelPrimaryConnection",
  items:  Array<Primary | null >,
  nextToken?: string | null,
};

export type ModelRelatedManyFilterInput = {
  id?: ModelIDInput | null,
  secret?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelRelatedManyFilterInput | null > | null,
  or?: Array< ModelRelatedManyFilterInput | null > | null,
  not?: ModelRelatedManyFilterInput | null,
  primaryRelatedManyId?: ModelIDInput | null,
  owner?: ModelStringInput | null,
};

export type ModelRelatedOneFilterInput = {
  id?: ModelIDInput | null,
  secret?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelRelatedOneFilterInput | null > | null,
  or?: Array< ModelRelatedOneFilterInput | null > | null,
  not?: ModelRelatedOneFilterInput | null,
  relatedOnePrimaryId?: ModelIDInput | null,
  owner?: ModelStringInput | null,
};

export type ModelRelatedOneConnection = {
  __typename: "ModelRelatedOneConnection",
  items:  Array<RelatedOne | null >,
  nextToken?: string | null,
};

export type ModelManyLeftFilterInput = {
  id?: ModelIDInput | null,
  secret?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelManyLeftFilterInput | null > | null,
  or?: Array< ModelManyLeftFilterInput | null > | null,
  not?: ModelManyLeftFilterInput | null,
  owner?: ModelStringInput | null,
};

export type ModelManyLeftConnection = {
  __typename: "ModelManyLeftConnection",
  items:  Array<ManyLeft | null >,
  nextToken?: string | null,
};

export type ModelManyRightFilterInput = {
  id?: ModelIDInput | null,
  secret?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelManyRightFilterInput | null > | null,
  or?: Array< ModelManyRightFilterInput | null > | null,
  not?: ModelManyRightFilterInput | null,
  owner?: ModelStringInput | null,
};

export type ModelManyRightConnection = {
  __typename: "ModelManyRightConnection",
  items:  Array<ManyRight | null >,
  nextToken?: string | null,
};

export type ModelLeftRightJoinFilterInput = {
  id?: ModelIDInput | null,
  manyLeftId?: ModelIDInput | null,
  manyRightId?: ModelIDInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelLeftRightJoinFilterInput | null > | null,
  or?: Array< ModelLeftRightJoinFilterInput | null > | null,
  not?: ModelLeftRightJoinFilterInput | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionPrimaryFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  secret?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionPrimaryFilterInput | null > | null,
  or?: Array< ModelSubscriptionPrimaryFilterInput | null > | null,
  primaryRelatedManyId?: ModelSubscriptionIDInput | null,
  primaryRelatedOneId?: ModelSubscriptionIDInput | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionRelatedManyFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  secret?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionRelatedManyFilterInput | null > | null,
  or?: Array< ModelSubscriptionRelatedManyFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionRelatedOneFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  secret?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionRelatedOneFilterInput | null > | null,
  or?: Array< ModelSubscriptionRelatedOneFilterInput | null > | null,
  relatedOnePrimaryId?: ModelSubscriptionIDInput | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionManyLeftFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  secret?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionManyLeftFilterInput | null > | null,
  or?: Array< ModelSubscriptionManyLeftFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionManyRightFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  secret?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionManyRightFilterInput | null > | null,
  or?: Array< ModelSubscriptionManyRightFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionLeftRightJoinFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  manyLeftId?: ModelSubscriptionIDInput | null,
  manyRightId?: ModelSubscriptionIDInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionLeftRightJoinFilterInput | null > | null,
  or?: Array< ModelSubscriptionLeftRightJoinFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type CreatePrimaryMutationVariables = {
  input: CreatePrimaryInput,
  condition?: ModelPrimaryConditionInput | null,
};

export type CreatePrimaryMutation = {
  createPrimary?:  {
    __typename: "Primary",
    id: string,
    secret?: string | null,
    relatedMany?:  {
      __typename: "ModelRelatedManyConnection",
      items:  Array< {
        __typename: "RelatedMany",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedManyId?: string | null,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOne",
      id: string,
      secret?: string | null,
      primary?:  {
        __typename: "Primary",
        id: string,
        secret?: string | null,
        relatedMany?:  {
          __typename: "ModelRelatedManyConnection",
          nextToken?: string | null,
        } | null,
        relatedOne?:  {
          __typename: "RelatedOne",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          relatedOnePrimaryId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedOneId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      relatedOnePrimaryId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedOneId?: string | null,
    owner?: string | null,
  } | null,
};

export type UpdatePrimaryMutationVariables = {
  input: UpdatePrimaryInput,
  condition?: ModelPrimaryConditionInput | null,
};

export type UpdatePrimaryMutation = {
  updatePrimary?:  {
    __typename: "Primary",
    id: string,
    secret?: string | null,
    relatedMany?:  {
      __typename: "ModelRelatedManyConnection",
      items:  Array< {
        __typename: "RelatedMany",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedManyId?: string | null,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOne",
      id: string,
      secret?: string | null,
      primary?:  {
        __typename: "Primary",
        id: string,
        secret?: string | null,
        relatedMany?:  {
          __typename: "ModelRelatedManyConnection",
          nextToken?: string | null,
        } | null,
        relatedOne?:  {
          __typename: "RelatedOne",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          relatedOnePrimaryId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedOneId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      relatedOnePrimaryId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedOneId?: string | null,
    owner?: string | null,
  } | null,
};

export type DeletePrimaryMutationVariables = {
  input: DeletePrimaryInput,
  condition?: ModelPrimaryConditionInput | null,
};

export type DeletePrimaryMutation = {
  deletePrimary?:  {
    __typename: "Primary",
    id: string,
    secret?: string | null,
    relatedMany?:  {
      __typename: "ModelRelatedManyConnection",
      items:  Array< {
        __typename: "RelatedMany",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedManyId?: string | null,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOne",
      id: string,
      secret?: string | null,
      primary?:  {
        __typename: "Primary",
        id: string,
        secret?: string | null,
        relatedMany?:  {
          __typename: "ModelRelatedManyConnection",
          nextToken?: string | null,
        } | null,
        relatedOne?:  {
          __typename: "RelatedOne",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          relatedOnePrimaryId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedOneId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      relatedOnePrimaryId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedOneId?: string | null,
    owner?: string | null,
  } | null,
};

export type CreateRelatedManyMutationVariables = {
  input: CreateRelatedManyInput,
  condition?: ModelRelatedManyConditionInput | null,
};

export type CreateRelatedManyMutation = {
  createRelatedMany?:  {
    __typename: "RelatedMany",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedManyId?: string | null,
    owner?: string | null,
  } | null,
};

export type UpdateRelatedManyMutationVariables = {
  input: UpdateRelatedManyInput,
  condition?: ModelRelatedManyConditionInput | null,
};

export type UpdateRelatedManyMutation = {
  updateRelatedMany?:  {
    __typename: "RelatedMany",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedManyId?: string | null,
    owner?: string | null,
  } | null,
};

export type DeleteRelatedManyMutationVariables = {
  input: DeleteRelatedManyInput,
  condition?: ModelRelatedManyConditionInput | null,
};

export type DeleteRelatedManyMutation = {
  deleteRelatedMany?:  {
    __typename: "RelatedMany",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedManyId?: string | null,
    owner?: string | null,
  } | null,
};

export type CreateRelatedOneMutationVariables = {
  input: CreateRelatedOneInput,
  condition?: ModelRelatedOneConditionInput | null,
};

export type CreateRelatedOneMutation = {
  createRelatedOne?:  {
    __typename: "RelatedOne",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    relatedOnePrimaryId?: string | null,
    owner?: string | null,
  } | null,
};

export type UpdateRelatedOneMutationVariables = {
  input: UpdateRelatedOneInput,
  condition?: ModelRelatedOneConditionInput | null,
};

export type UpdateRelatedOneMutation = {
  updateRelatedOne?:  {
    __typename: "RelatedOne",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    relatedOnePrimaryId?: string | null,
    owner?: string | null,
  } | null,
};

export type DeleteRelatedOneMutationVariables = {
  input: DeleteRelatedOneInput,
  condition?: ModelRelatedOneConditionInput | null,
};

export type DeleteRelatedOneMutation = {
  deleteRelatedOne?:  {
    __typename: "RelatedOne",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    relatedOnePrimaryId?: string | null,
    owner?: string | null,
  } | null,
};

export type CreateManyLeftMutationVariables = {
  input: CreateManyLeftInput,
  condition?: ModelManyLeftConditionInput | null,
};

export type CreateManyLeftMutation = {
  createManyLeft?:  {
    __typename: "ManyLeft",
    id: string,
    secret?: string | null,
    manyRight?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type UpdateManyLeftMutationVariables = {
  input: UpdateManyLeftInput,
  condition?: ModelManyLeftConditionInput | null,
};

export type UpdateManyLeftMutation = {
  updateManyLeft?:  {
    __typename: "ManyLeft",
    id: string,
    secret?: string | null,
    manyRight?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type DeleteManyLeftMutationVariables = {
  input: DeleteManyLeftInput,
  condition?: ModelManyLeftConditionInput | null,
};

export type DeleteManyLeftMutation = {
  deleteManyLeft?:  {
    __typename: "ManyLeft",
    id: string,
    secret?: string | null,
    manyRight?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type CreateManyRightMutationVariables = {
  input: CreateManyRightInput,
  condition?: ModelManyRightConditionInput | null,
};

export type CreateManyRightMutation = {
  createManyRight?:  {
    __typename: "ManyRight",
    id: string,
    secret?: string | null,
    manyLeft?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type UpdateManyRightMutationVariables = {
  input: UpdateManyRightInput,
  condition?: ModelManyRightConditionInput | null,
};

export type UpdateManyRightMutation = {
  updateManyRight?:  {
    __typename: "ManyRight",
    id: string,
    secret?: string | null,
    manyLeft?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type DeleteManyRightMutationVariables = {
  input: DeleteManyRightInput,
  condition?: ModelManyRightConditionInput | null,
};

export type DeleteManyRightMutation = {
  deleteManyRight?:  {
    __typename: "ManyRight",
    id: string,
    secret?: string | null,
    manyLeft?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type CreateLeftRightJoinMutationVariables = {
  input: CreateLeftRightJoinInput,
  condition?: ModelLeftRightJoinConditionInput | null,
};

export type CreateLeftRightJoinMutation = {
  createLeftRightJoin?:  {
    __typename: "LeftRightJoin",
    id: string,
    manyLeftId: string,
    manyRightId: string,
    manyLeft:  {
      __typename: "ManyLeft",
      id: string,
      secret?: string | null,
      manyRight?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    manyRight:  {
      __typename: "ManyRight",
      id: string,
      secret?: string | null,
      manyLeft?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type UpdateLeftRightJoinMutationVariables = {
  input: UpdateLeftRightJoinInput,
  condition?: ModelLeftRightJoinConditionInput | null,
};

export type UpdateLeftRightJoinMutation = {
  updateLeftRightJoin?:  {
    __typename: "LeftRightJoin",
    id: string,
    manyLeftId: string,
    manyRightId: string,
    manyLeft:  {
      __typename: "ManyLeft",
      id: string,
      secret?: string | null,
      manyRight?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    manyRight:  {
      __typename: "ManyRight",
      id: string,
      secret?: string | null,
      manyLeft?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type DeleteLeftRightJoinMutationVariables = {
  input: DeleteLeftRightJoinInput,
  condition?: ModelLeftRightJoinConditionInput | null,
};

export type DeleteLeftRightJoinMutation = {
  deleteLeftRightJoin?:  {
    __typename: "LeftRightJoin",
    id: string,
    manyLeftId: string,
    manyRightId: string,
    manyLeft:  {
      __typename: "ManyLeft",
      id: string,
      secret?: string | null,
      manyRight?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    manyRight:  {
      __typename: "ManyRight",
      id: string,
      secret?: string | null,
      manyLeft?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type GetPrimaryQueryVariables = {
  id: string,
};

export type GetPrimaryQuery = {
  getPrimary?:  {
    __typename: "Primary",
    id: string,
    secret?: string | null,
    relatedMany?:  {
      __typename: "ModelRelatedManyConnection",
      items:  Array< {
        __typename: "RelatedMany",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedManyId?: string | null,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOne",
      id: string,
      secret?: string | null,
      primary?:  {
        __typename: "Primary",
        id: string,
        secret?: string | null,
        relatedMany?:  {
          __typename: "ModelRelatedManyConnection",
          nextToken?: string | null,
        } | null,
        relatedOne?:  {
          __typename: "RelatedOne",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          relatedOnePrimaryId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedOneId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      relatedOnePrimaryId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedOneId?: string | null,
    owner?: string | null,
  } | null,
};

export type ListPrimariesQueryVariables = {
  id?: string | null,
  filter?: ModelPrimaryFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListPrimariesQuery = {
  listPrimaries?:  {
    __typename: "ModelPrimaryConnection",
    items:  Array< {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetRelatedManyQueryVariables = {
  id: string,
};

export type GetRelatedManyQuery = {
  getRelatedMany?:  {
    __typename: "RelatedMany",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedManyId?: string | null,
    owner?: string | null,
  } | null,
};

export type ListRelatedManiesQueryVariables = {
  id?: string | null,
  filter?: ModelRelatedManyFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListRelatedManiesQuery = {
  listRelatedManies?:  {
    __typename: "ModelRelatedManyConnection",
    items:  Array< {
      __typename: "RelatedMany",
      id: string,
      secret?: string | null,
      primary?:  {
        __typename: "Primary",
        id: string,
        secret?: string | null,
        relatedMany?:  {
          __typename: "ModelRelatedManyConnection",
          nextToken?: string | null,
        } | null,
        relatedOne?:  {
          __typename: "RelatedOne",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          relatedOnePrimaryId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedOneId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedManyId?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetRelatedOneQueryVariables = {
  id: string,
};

export type GetRelatedOneQuery = {
  getRelatedOne?:  {
    __typename: "RelatedOne",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    relatedOnePrimaryId?: string | null,
    owner?: string | null,
  } | null,
};

export type ListRelatedOnesQueryVariables = {
  id?: string | null,
  filter?: ModelRelatedOneFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListRelatedOnesQuery = {
  listRelatedOnes?:  {
    __typename: "ModelRelatedOneConnection",
    items:  Array< {
      __typename: "RelatedOne",
      id: string,
      secret?: string | null,
      primary?:  {
        __typename: "Primary",
        id: string,
        secret?: string | null,
        relatedMany?:  {
          __typename: "ModelRelatedManyConnection",
          nextToken?: string | null,
        } | null,
        relatedOne?:  {
          __typename: "RelatedOne",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          relatedOnePrimaryId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedOneId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      relatedOnePrimaryId?: string | null,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetManyLeftQueryVariables = {
  id: string,
};

export type GetManyLeftQuery = {
  getManyLeft?:  {
    __typename: "ManyLeft",
    id: string,
    secret?: string | null,
    manyRight?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type ListManyLeftsQueryVariables = {
  id?: string | null,
  filter?: ModelManyLeftFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListManyLeftsQuery = {
  listManyLefts?:  {
    __typename: "ModelManyLeftConnection",
    items:  Array< {
      __typename: "ManyLeft",
      id: string,
      secret?: string | null,
      manyRight?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetManyRightQueryVariables = {
  id: string,
};

export type GetManyRightQuery = {
  getManyRight?:  {
    __typename: "ManyRight",
    id: string,
    secret?: string | null,
    manyLeft?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type ListManyRightsQueryVariables = {
  id?: string | null,
  filter?: ModelManyRightFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListManyRightsQuery = {
  listManyRights?:  {
    __typename: "ModelManyRightConnection",
    items:  Array< {
      __typename: "ManyRight",
      id: string,
      secret?: string | null,
      manyLeft?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetLeftRightJoinQueryVariables = {
  id: string,
};

export type GetLeftRightJoinQuery = {
  getLeftRightJoin?:  {
    __typename: "LeftRightJoin",
    id: string,
    manyLeftId: string,
    manyRightId: string,
    manyLeft:  {
      __typename: "ManyLeft",
      id: string,
      secret?: string | null,
      manyRight?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    manyRight:  {
      __typename: "ManyRight",
      id: string,
      secret?: string | null,
      manyLeft?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type ListLeftRightJoinsQueryVariables = {
  filter?: ModelLeftRightJoinFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListLeftRightJoinsQuery = {
  listLeftRightJoins?:  {
    __typename: "ModelLeftRightJoinConnection",
    items:  Array< {
      __typename: "LeftRightJoin",
      id: string,
      manyLeftId: string,
      manyRightId: string,
      manyLeft:  {
        __typename: "ManyLeft",
        id: string,
        secret?: string | null,
        manyRight?:  {
          __typename: "ModelLeftRightJoinConnection",
          nextToken?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      },
      manyRight:  {
        __typename: "ManyRight",
        id: string,
        secret?: string | null,
        manyLeft?:  {
          __typename: "ModelLeftRightJoinConnection",
          nextToken?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      },
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type LeftRightJoinsByManyLeftIdQueryVariables = {
  manyLeftId: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelLeftRightJoinFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type LeftRightJoinsByManyLeftIdQuery = {
  leftRightJoinsByManyLeftId?:  {
    __typename: "ModelLeftRightJoinConnection",
    items:  Array< {
      __typename: "LeftRightJoin",
      id: string,
      manyLeftId: string,
      manyRightId: string,
      manyLeft:  {
        __typename: "ManyLeft",
        id: string,
        secret?: string | null,
        manyRight?:  {
          __typename: "ModelLeftRightJoinConnection",
          nextToken?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      },
      manyRight:  {
        __typename: "ManyRight",
        id: string,
        secret?: string | null,
        manyLeft?:  {
          __typename: "ModelLeftRightJoinConnection",
          nextToken?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      },
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type LeftRightJoinsByManyRightIdQueryVariables = {
  manyRightId: string,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelLeftRightJoinFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type LeftRightJoinsByManyRightIdQuery = {
  leftRightJoinsByManyRightId?:  {
    __typename: "ModelLeftRightJoinConnection",
    items:  Array< {
      __typename: "LeftRightJoin",
      id: string,
      manyLeftId: string,
      manyRightId: string,
      manyLeft:  {
        __typename: "ManyLeft",
        id: string,
        secret?: string | null,
        manyRight?:  {
          __typename: "ModelLeftRightJoinConnection",
          nextToken?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      },
      manyRight:  {
        __typename: "ManyRight",
        id: string,
        secret?: string | null,
        manyLeft?:  {
          __typename: "ModelLeftRightJoinConnection",
          nextToken?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      },
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type OnCreatePrimarySubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryFilterInput | null,
  owner?: string | null,
};

export type OnCreatePrimarySubscription = {
  onCreatePrimary?:  {
    __typename: "Primary",
    id: string,
    secret?: string | null,
    relatedMany?:  {
      __typename: "ModelRelatedManyConnection",
      items:  Array< {
        __typename: "RelatedMany",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedManyId?: string | null,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOne",
      id: string,
      secret?: string | null,
      primary?:  {
        __typename: "Primary",
        id: string,
        secret?: string | null,
        relatedMany?:  {
          __typename: "ModelRelatedManyConnection",
          nextToken?: string | null,
        } | null,
        relatedOne?:  {
          __typename: "RelatedOne",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          relatedOnePrimaryId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedOneId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      relatedOnePrimaryId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedOneId?: string | null,
    owner?: string | null,
  } | null,
};

export type OnUpdatePrimarySubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryFilterInput | null,
  owner?: string | null,
};

export type OnUpdatePrimarySubscription = {
  onUpdatePrimary?:  {
    __typename: "Primary",
    id: string,
    secret?: string | null,
    relatedMany?:  {
      __typename: "ModelRelatedManyConnection",
      items:  Array< {
        __typename: "RelatedMany",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedManyId?: string | null,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOne",
      id: string,
      secret?: string | null,
      primary?:  {
        __typename: "Primary",
        id: string,
        secret?: string | null,
        relatedMany?:  {
          __typename: "ModelRelatedManyConnection",
          nextToken?: string | null,
        } | null,
        relatedOne?:  {
          __typename: "RelatedOne",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          relatedOnePrimaryId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedOneId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      relatedOnePrimaryId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedOneId?: string | null,
    owner?: string | null,
  } | null,
};

export type OnDeletePrimarySubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryFilterInput | null,
  owner?: string | null,
};

export type OnDeletePrimarySubscription = {
  onDeletePrimary?:  {
    __typename: "Primary",
    id: string,
    secret?: string | null,
    relatedMany?:  {
      __typename: "ModelRelatedManyConnection",
      items:  Array< {
        __typename: "RelatedMany",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedManyId?: string | null,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOne",
      id: string,
      secret?: string | null,
      primary?:  {
        __typename: "Primary",
        id: string,
        secret?: string | null,
        relatedMany?:  {
          __typename: "ModelRelatedManyConnection",
          nextToken?: string | null,
        } | null,
        relatedOne?:  {
          __typename: "RelatedOne",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          relatedOnePrimaryId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        primaryRelatedOneId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      relatedOnePrimaryId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedOneId?: string | null,
    owner?: string | null,
  } | null,
};

export type OnCreateRelatedManySubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyFilterInput | null,
  owner?: string | null,
};

export type OnCreateRelatedManySubscription = {
  onCreateRelatedMany?:  {
    __typename: "RelatedMany",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedManyId?: string | null,
    owner?: string | null,
  } | null,
};

export type OnUpdateRelatedManySubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyFilterInput | null,
  owner?: string | null,
};

export type OnUpdateRelatedManySubscription = {
  onUpdateRelatedMany?:  {
    __typename: "RelatedMany",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedManyId?: string | null,
    owner?: string | null,
  } | null,
};

export type OnDeleteRelatedManySubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyFilterInput | null,
  owner?: string | null,
};

export type OnDeleteRelatedManySubscription = {
  onDeleteRelatedMany?:  {
    __typename: "RelatedMany",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    primaryRelatedManyId?: string | null,
    owner?: string | null,
  } | null,
};

export type OnCreateRelatedOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneFilterInput | null,
  owner?: string | null,
};

export type OnCreateRelatedOneSubscription = {
  onCreateRelatedOne?:  {
    __typename: "RelatedOne",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    relatedOnePrimaryId?: string | null,
    owner?: string | null,
  } | null,
};

export type OnUpdateRelatedOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneFilterInput | null,
  owner?: string | null,
};

export type OnUpdateRelatedOneSubscription = {
  onUpdateRelatedOne?:  {
    __typename: "RelatedOne",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    relatedOnePrimaryId?: string | null,
    owner?: string | null,
  } | null,
};

export type OnDeleteRelatedOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneFilterInput | null,
  owner?: string | null,
};

export type OnDeleteRelatedOneSubscription = {
  onDeleteRelatedOne?:  {
    __typename: "RelatedOne",
    id: string,
    secret?: string | null,
    primary?:  {
      __typename: "Primary",
      id: string,
      secret?: string | null,
      relatedMany?:  {
        __typename: "ModelRelatedManyConnection",
        items:  Array< {
          __typename: "RelatedMany",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedManyId?: string | null,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      relatedOne?:  {
        __typename: "RelatedOne",
        id: string,
        secret?: string | null,
        primary?:  {
          __typename: "Primary",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          primaryRelatedOneId?: string | null,
          owner?: string | null,
        } | null,
        createdAt: string,
        updatedAt: string,
        relatedOnePrimaryId?: string | null,
        owner?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      primaryRelatedOneId?: string | null,
      owner?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    relatedOnePrimaryId?: string | null,
    owner?: string | null,
  } | null,
};

export type OnCreateManyLeftSubscriptionVariables = {
  filter?: ModelSubscriptionManyLeftFilterInput | null,
  owner?: string | null,
};

export type OnCreateManyLeftSubscription = {
  onCreateManyLeft?:  {
    __typename: "ManyLeft",
    id: string,
    secret?: string | null,
    manyRight?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type OnUpdateManyLeftSubscriptionVariables = {
  filter?: ModelSubscriptionManyLeftFilterInput | null,
  owner?: string | null,
};

export type OnUpdateManyLeftSubscription = {
  onUpdateManyLeft?:  {
    __typename: "ManyLeft",
    id: string,
    secret?: string | null,
    manyRight?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type OnDeleteManyLeftSubscriptionVariables = {
  filter?: ModelSubscriptionManyLeftFilterInput | null,
  owner?: string | null,
};

export type OnDeleteManyLeftSubscription = {
  onDeleteManyLeft?:  {
    __typename: "ManyLeft",
    id: string,
    secret?: string | null,
    manyRight?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type OnCreateManyRightSubscriptionVariables = {
  filter?: ModelSubscriptionManyRightFilterInput | null,
  owner?: string | null,
};

export type OnCreateManyRightSubscription = {
  onCreateManyRight?:  {
    __typename: "ManyRight",
    id: string,
    secret?: string | null,
    manyLeft?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type OnUpdateManyRightSubscriptionVariables = {
  filter?: ModelSubscriptionManyRightFilterInput | null,
  owner?: string | null,
};

export type OnUpdateManyRightSubscription = {
  onUpdateManyRight?:  {
    __typename: "ManyRight",
    id: string,
    secret?: string | null,
    manyLeft?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type OnDeleteManyRightSubscriptionVariables = {
  filter?: ModelSubscriptionManyRightFilterInput | null,
  owner?: string | null,
};

export type OnDeleteManyRightSubscription = {
  onDeleteManyRight?:  {
    __typename: "ManyRight",
    id: string,
    secret?: string | null,
    manyLeft?:  {
      __typename: "ModelLeftRightJoinConnection",
      items:  Array< {
        __typename: "LeftRightJoin",
        id: string,
        manyLeftId: string,
        manyRightId: string,
        manyLeft:  {
          __typename: "ManyLeft",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        manyRight:  {
          __typename: "ManyRight",
          id: string,
          secret?: string | null,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        },
        createdAt: string,
        updatedAt: string,
        owner?: string | null,
      } | null >,
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type OnCreateLeftRightJoinSubscriptionVariables = {
  filter?: ModelSubscriptionLeftRightJoinFilterInput | null,
  owner?: string | null,
};

export type OnCreateLeftRightJoinSubscription = {
  onCreateLeftRightJoin?:  {
    __typename: "LeftRightJoin",
    id: string,
    manyLeftId: string,
    manyRightId: string,
    manyLeft:  {
      __typename: "ManyLeft",
      id: string,
      secret?: string | null,
      manyRight?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    manyRight:  {
      __typename: "ManyRight",
      id: string,
      secret?: string | null,
      manyLeft?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type OnUpdateLeftRightJoinSubscriptionVariables = {
  filter?: ModelSubscriptionLeftRightJoinFilterInput | null,
  owner?: string | null,
};

export type OnUpdateLeftRightJoinSubscription = {
  onUpdateLeftRightJoin?:  {
    __typename: "LeftRightJoin",
    id: string,
    manyLeftId: string,
    manyRightId: string,
    manyLeft:  {
      __typename: "ManyLeft",
      id: string,
      secret?: string | null,
      manyRight?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    manyRight:  {
      __typename: "ManyRight",
      id: string,
      secret?: string | null,
      manyLeft?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};

export type OnDeleteLeftRightJoinSubscriptionVariables = {
  filter?: ModelSubscriptionLeftRightJoinFilterInput | null,
  owner?: string | null,
};

export type OnDeleteLeftRightJoinSubscription = {
  onDeleteLeftRightJoin?:  {
    __typename: "LeftRightJoin",
    id: string,
    manyLeftId: string,
    manyRightId: string,
    manyLeft:  {
      __typename: "ManyLeft",
      id: string,
      secret?: string | null,
      manyRight?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    manyRight:  {
      __typename: "ManyRight",
      id: string,
      secret?: string | null,
      manyLeft?:  {
        __typename: "ModelLeftRightJoinConnection",
        items:  Array< {
          __typename: "LeftRightJoin",
          id: string,
          manyLeftId: string,
          manyRightId: string,
          createdAt: string,
          updatedAt: string,
          owner?: string | null,
        } | null >,
        nextToken?: string | null,
      } | null,
      createdAt: string,
      updatedAt: string,
      owner?: string | null,
    },
    createdAt: string,
    updatedAt: string,
    owner?: string | null,
  } | null,
};
