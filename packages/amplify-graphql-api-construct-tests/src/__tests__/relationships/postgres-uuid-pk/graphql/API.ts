/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type Primary = {
  id: string;
  relatedMany?: ModelRelatedManyConnection | null;
  relatedOne?: RelatedOne | null;
};

export type ModelRelatedManyConnection = {
  items: Array<RelatedMany | null>;
  nextToken?: string | null;
};

export type RelatedMany = {
  id: string;
  primary?: Primary | null;
  primaryId?: string | null;
};

export type RelatedOne = {
  id: string;
  primary?: Primary | null;
  primaryId?: string | null;
};

export type ModelPrimaryFilterInput = {
  and?: Array<ModelPrimaryFilterInput | null> | null;
  createdAt?: ModelStringInput | null;
  id?: ModelIDInput | null;
  not?: ModelPrimaryFilterInput | null;
  or?: Array<ModelPrimaryFilterInput | null> | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelStringInput = {
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  beginsWith?: string | null;
  between?: Array<string | null> | null;
  contains?: string | null;
  eq?: string | null;
  ge?: string | null;
  gt?: string | null;
  le?: string | null;
  lt?: string | null;
  ne?: string | null;
  notContains?: string | null;
  size?: ModelSizeInput | null;
};

export enum ModelAttributeTypes {
  _null = '_null',
  binary = 'binary',
  binarySet = 'binarySet',
  bool = 'bool',
  list = 'list',
  map = 'map',
  number = 'number',
  numberSet = 'numberSet',
  string = 'string',
  stringSet = 'stringSet',
}

export type ModelSizeInput = {
  between?: Array<number | null> | null;
  eq?: number | null;
  ge?: number | null;
  gt?: number | null;
  le?: number | null;
  lt?: number | null;
  ne?: number | null;
};

export type ModelIDInput = {
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  beginsWith?: string | null;
  between?: Array<string | null> | null;
  contains?: string | null;
  eq?: string | null;
  ge?: string | null;
  gt?: string | null;
  le?: string | null;
  lt?: string | null;
  ne?: string | null;
  notContains?: string | null;
  size?: ModelSizeInput | null;
};

export enum ModelSortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type ModelPrimaryConnection = {
  items: Array<Primary | null>;
  nextToken?: string | null;
};

export type ModelIDKeyConditionInput = {
  beginsWith?: string | null;
  between?: Array<string | null> | null;
  eq?: string | null;
  ge?: string | null;
  gt?: string | null;
  le?: string | null;
  lt?: string | null;
};

export type ModelRelatedManyFilterInput = {
  and?: Array<ModelRelatedManyFilterInput | null> | null;
  createdAt?: ModelStringInput | null;
  id?: ModelIDInput | null;
  not?: ModelRelatedManyFilterInput | null;
  or?: Array<ModelRelatedManyFilterInput | null> | null;
  primaryId?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelRelatedOneFilterInput = {
  and?: Array<ModelRelatedOneFilterInput | null> | null;
  createdAt?: ModelStringInput | null;
  id?: ModelIDInput | null;
  not?: ModelRelatedOneFilterInput | null;
  or?: Array<ModelRelatedOneFilterInput | null> | null;
  primaryId?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelRelatedOneConnection = {
  items: Array<RelatedOne | null>;
  nextToken?: string | null;
};

export type ModelPrimaryConditionInput = {
  and?: Array<ModelPrimaryConditionInput | null> | null;
  createdAt?: ModelStringInput | null;
  not?: ModelPrimaryConditionInput | null;
  or?: Array<ModelPrimaryConditionInput | null> | null;
  updatedAt?: ModelStringInput | null;
};

export type CreatePrimaryInput = {
  id?: string | null;
};

export type ModelRelatedManyConditionInput = {
  and?: Array<ModelRelatedManyConditionInput | null> | null;
  createdAt?: ModelStringInput | null;
  not?: ModelRelatedManyConditionInput | null;
  or?: Array<ModelRelatedManyConditionInput | null> | null;
  primaryId?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type CreateRelatedManyInput = {
  id?: string | null;
  primaryId?: string | null;
};

export type ModelRelatedOneConditionInput = {
  and?: Array<ModelRelatedOneConditionInput | null> | null;
  createdAt?: ModelStringInput | null;
  not?: ModelRelatedOneConditionInput | null;
  or?: Array<ModelRelatedOneConditionInput | null> | null;
  primaryId?: ModelStringInput | null;
  updatedAt?: ModelStringInput | null;
};

export type CreateRelatedOneInput = {
  id?: string | null;
  primaryId?: string | null;
};

export type DeletePrimaryInput = {
  id: string;
};

export type DeleteRelatedManyInput = {
  id: string;
};

export type DeleteRelatedOneInput = {
  id: string;
};

export type UpdatePrimaryInput = {
  id: string;
};

export type UpdateRelatedManyInput = {
  id: string;
  primaryId?: string | null;
};

export type UpdateRelatedOneInput = {
  id: string;
  primaryId?: string | null;
};

export type ModelSubscriptionPrimaryFilterInput = {
  and?: Array<ModelSubscriptionPrimaryFilterInput | null> | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionIDInput | null;
  or?: Array<ModelSubscriptionPrimaryFilterInput | null> | null;
  updatedAt?: ModelSubscriptionStringInput | null;
};

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null;
  between?: Array<string | null> | null;
  contains?: string | null;
  eq?: string | null;
  ge?: string | null;
  gt?: string | null;
  in?: Array<string | null> | null;
  le?: string | null;
  lt?: string | null;
  ne?: string | null;
  notContains?: string | null;
  notIn?: Array<string | null> | null;
};

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null;
  between?: Array<string | null> | null;
  contains?: string | null;
  eq?: string | null;
  ge?: string | null;
  gt?: string | null;
  in?: Array<string | null> | null;
  le?: string | null;
  lt?: string | null;
  ne?: string | null;
  notContains?: string | null;
  notIn?: Array<string | null> | null;
};

export type ModelSubscriptionRelatedManyFilterInput = {
  and?: Array<ModelSubscriptionRelatedManyFilterInput | null> | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionIDInput | null;
  or?: Array<ModelSubscriptionRelatedManyFilterInput | null> | null;
  primaryId?: ModelSubscriptionStringInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
};

export type ModelSubscriptionRelatedOneFilterInput = {
  and?: Array<ModelSubscriptionRelatedOneFilterInput | null> | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionIDInput | null;
  or?: Array<ModelSubscriptionRelatedOneFilterInput | null> | null;
  primaryId?: ModelSubscriptionStringInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
};

export type GetPrimaryQueryVariables = {
  id: string;
};

export type GetPrimaryQuery = {
  getPrimary?: {
    id: string;
    relatedMany?: {
      items: Array<{
        id: string;
        primaryId?: string | null;
        primary?: {
          id: string;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primary?: {
        id: string;
        relatedMany?: {
          nextToken?: string | null;
        } | null;
        relatedOne?: {
          id: string;
          primaryId?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type GetRelatedManyQueryVariables = {
  id: string;
};

export type GetRelatedManyQuery = {
  getRelatedMany?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type GetRelatedOneQueryVariables = {
  id: string;
};

export type GetRelatedOneQuery = {
  getRelatedOne?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type ListPrimariesQueryVariables = {
  filter?: ModelPrimaryFilterInput | null;
  id?: string | null;
  limit?: number | null;
  nextToken?: string | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListPrimariesQuery = {
  listPrimaries?: {
    items: Array<{
      id: string;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type ListRelatedManiesQueryVariables = {
  filter?: ModelRelatedManyFilterInput | null;
  id?: string | null;
  limit?: number | null;
  nextToken?: string | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListRelatedManiesQuery = {
  listRelatedManies?: {
    items: Array<{
      id: string;
      primaryId?: string | null;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type ListRelatedOnesQueryVariables = {
  filter?: ModelRelatedOneFilterInput | null;
  id?: string | null;
  limit?: number | null;
  nextToken?: string | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListRelatedOnesQuery = {
  listRelatedOnes?: {
    items: Array<{
      id: string;
      primaryId?: string | null;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type CreatePrimaryMutationVariables = {
  condition?: ModelPrimaryConditionInput | null;
  input: CreatePrimaryInput;
};

export type CreatePrimaryMutation = {
  createPrimary?: {
    id: string;
    relatedMany?: {
      items: Array<{
        id: string;
        primaryId?: string | null;
        primary?: {
          id: string;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primary?: {
        id: string;
        relatedMany?: {
          nextToken?: string | null;
        } | null;
        relatedOne?: {
          id: string;
          primaryId?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type CreateRelatedManyMutationVariables = {
  condition?: ModelRelatedManyConditionInput | null;
  input: CreateRelatedManyInput;
};

export type CreateRelatedManyMutation = {
  createRelatedMany?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type CreateRelatedOneMutationVariables = {
  condition?: ModelRelatedOneConditionInput | null;
  input: CreateRelatedOneInput;
};

export type CreateRelatedOneMutation = {
  createRelatedOne?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type DeletePrimaryMutationVariables = {
  condition?: ModelPrimaryConditionInput | null;
  input: DeletePrimaryInput;
};

export type DeletePrimaryMutation = {
  deletePrimary?: {
    id: string;
    relatedMany?: {
      items: Array<{
        id: string;
        primaryId?: string | null;
        primary?: {
          id: string;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primary?: {
        id: string;
        relatedMany?: {
          nextToken?: string | null;
        } | null;
        relatedOne?: {
          id: string;
          primaryId?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type DeleteRelatedManyMutationVariables = {
  condition?: ModelRelatedManyConditionInput | null;
  input: DeleteRelatedManyInput;
};

export type DeleteRelatedManyMutation = {
  deleteRelatedMany?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type DeleteRelatedOneMutationVariables = {
  condition?: ModelRelatedOneConditionInput | null;
  input: DeleteRelatedOneInput;
};

export type DeleteRelatedOneMutation = {
  deleteRelatedOne?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type UpdatePrimaryMutationVariables = {
  condition?: ModelPrimaryConditionInput | null;
  input: UpdatePrimaryInput;
};

export type UpdatePrimaryMutation = {
  updatePrimary?: {
    id: string;
    relatedMany?: {
      items: Array<{
        id: string;
        primaryId?: string | null;
        primary?: {
          id: string;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primary?: {
        id: string;
        relatedMany?: {
          nextToken?: string | null;
        } | null;
        relatedOne?: {
          id: string;
          primaryId?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type UpdateRelatedManyMutationVariables = {
  condition?: ModelRelatedManyConditionInput | null;
  input: UpdateRelatedManyInput;
};

export type UpdateRelatedManyMutation = {
  updateRelatedMany?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type UpdateRelatedOneMutationVariables = {
  condition?: ModelRelatedOneConditionInput | null;
  input: UpdateRelatedOneInput;
};

export type UpdateRelatedOneMutation = {
  updateRelatedOne?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type OnCreatePrimarySubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryFilterInput | null;
};

export type OnCreatePrimarySubscription = {
  onCreatePrimary?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
    } | null;
  } | null;
};

export type OnCreateRelatedManySubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyFilterInput | null;
};

export type OnCreateRelatedManySubscription = {
  onCreateRelatedMany?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type OnCreateRelatedOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneFilterInput | null;
};

export type OnCreateRelatedOneSubscription = {
  onCreateRelatedOne?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type OnDeletePrimarySubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryFilterInput | null;
};

export type OnDeletePrimarySubscription = {
  onDeletePrimary?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
    } | null;
  } | null;
};

export type OnDeleteRelatedManySubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyFilterInput | null;
};

export type OnDeleteRelatedManySubscription = {
  onDeleteRelatedMany?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type OnDeleteRelatedOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneFilterInput | null;
};

export type OnDeleteRelatedOneSubscription = {
  onDeleteRelatedOne?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type OnUpdatePrimarySubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryFilterInput | null;
};

export type OnUpdatePrimarySubscription = {
  onUpdatePrimary?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
    } | null;
  } | null;
};

export type OnUpdateRelatedManySubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyFilterInput | null;
};

export type OnUpdateRelatedManySubscription = {
  onUpdateRelatedMany?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};

export type OnUpdateRelatedOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneFilterInput | null;
};

export type OnUpdateRelatedOneSubscription = {
  onUpdateRelatedOne?: {
    id: string;
    primary?: {
      id: string;
    } | null;
    primaryId?: string | null;
  } | null;
};
