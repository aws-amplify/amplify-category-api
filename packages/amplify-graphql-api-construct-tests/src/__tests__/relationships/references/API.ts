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

export type PrimaryCPKSKOne = {
  id: string;
  relatedMany?: ModelRelatedManyCPKSKOneConnection | null;
  relatedOne?: RelatedOneCPKSKOne | null;
  skOne: string;
};

export type ModelRelatedManyCPKSKOneConnection = {
  items: Array<RelatedManyCPKSKOne | null>;
  nextToken?: string | null;
};

export type RelatedManyCPKSKOne = {
  id: string;
  primary?: PrimaryCPKSKOne | null;
  primaryId?: string | null;
  primarySkOne?: string | null;
};

export type RelatedOneCPKSKOne = {
  id: string;
  primary?: PrimaryCPKSKOne | null;
  primaryId?: string | null;
  primarySkOne?: string | null;
};

export type PrimaryCPKSKTwo = {
  id: string;
  relatedMany?: ModelRelatedManyCPKSKTwoConnection | null;
  relatedOne?: RelatedOneCPKSKTwo | null;
  skOne: string;
  skTwo: string;
};

export type ModelRelatedManyCPKSKTwoConnection = {
  items: Array<RelatedManyCPKSKTwo | null>;
  nextToken?: string | null;
};

export type RelatedManyCPKSKTwo = {
  id: string;
  primary?: PrimaryCPKSKTwo | null;
  primaryId?: string | null;
  primarySkOne?: string | null;
  primarySkTwo?: string | null;
};

export type RelatedOneCPKSKTwo = {
  id: string;
  primary?: PrimaryCPKSKTwo | null;
  primaryId?: string | null;
  primarySkOne?: string | null;
  primarySkTwo?: string | null;
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

export type ModelPrimaryCPKSKOneFilterInput = {
  and?: Array<ModelPrimaryCPKSKOneFilterInput | null> | null;
  createdAt?: ModelStringInput | null;
  id?: ModelIDInput | null;
  not?: ModelPrimaryCPKSKOneFilterInput | null;
  or?: Array<ModelPrimaryCPKSKOneFilterInput | null> | null;
  skOne?: ModelIDInput | null;
  updatedAt?: ModelStringInput | null;
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

export type ModelPrimaryCPKSKOneConnection = {
  items: Array<PrimaryCPKSKOne | null>;
  nextToken?: string | null;
};

export type ModelPrimaryCPKSKTwoFilterInput = {
  and?: Array<ModelPrimaryCPKSKTwoFilterInput | null> | null;
  createdAt?: ModelStringInput | null;
  id?: ModelIDInput | null;
  not?: ModelPrimaryCPKSKTwoFilterInput | null;
  or?: Array<ModelPrimaryCPKSKTwoFilterInput | null> | null;
  skOne?: ModelIDInput | null;
  skTwo?: ModelIDInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelPrimaryCPKSKTwoPrimaryCompositeKeyConditionInput = {
  beginsWith?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null;
  between?: Array<ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null> | null;
  eq?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null;
  ge?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null;
  gt?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null;
  le?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null;
  lt?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null;
};

export type ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput = {
  skOne?: string | null;
  skTwo?: string | null;
};

export type ModelPrimaryCPKSKTwoConnection = {
  items: Array<PrimaryCPKSKTwo | null>;
  nextToken?: string | null;
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

export type ModelRelatedManyCPKSKOneFilterInput = {
  and?: Array<ModelRelatedManyCPKSKOneFilterInput | null> | null;
  createdAt?: ModelStringInput | null;
  id?: ModelStringInput | null;
  not?: ModelRelatedManyCPKSKOneFilterInput | null;
  or?: Array<ModelRelatedManyCPKSKOneFilterInput | null> | null;
  primaryId?: ModelIDInput | null;
  primarySkOne?: ModelIDInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelRelatedManyCPKSKTwoFilterInput = {
  and?: Array<ModelRelatedManyCPKSKTwoFilterInput | null> | null;
  createdAt?: ModelStringInput | null;
  id?: ModelStringInput | null;
  not?: ModelRelatedManyCPKSKTwoFilterInput | null;
  or?: Array<ModelRelatedManyCPKSKTwoFilterInput | null> | null;
  primaryId?: ModelIDInput | null;
  primarySkOne?: ModelIDInput | null;
  primarySkTwo?: ModelIDInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelRelatedOneCPKSKOneFilterInput = {
  and?: Array<ModelRelatedOneCPKSKOneFilterInput | null> | null;
  createdAt?: ModelStringInput | null;
  id?: ModelStringInput | null;
  not?: ModelRelatedOneCPKSKOneFilterInput | null;
  or?: Array<ModelRelatedOneCPKSKOneFilterInput | null> | null;
  primaryId?: ModelIDInput | null;
  primarySkOne?: ModelIDInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelRelatedOneCPKSKOneConnection = {
  items: Array<RelatedOneCPKSKOne | null>;
  nextToken?: string | null;
};

export type ModelRelatedOneCPKSKTwoFilterInput = {
  and?: Array<ModelRelatedOneCPKSKTwoFilterInput | null> | null;
  createdAt?: ModelStringInput | null;
  id?: ModelStringInput | null;
  not?: ModelRelatedOneCPKSKTwoFilterInput | null;
  or?: Array<ModelRelatedOneCPKSKTwoFilterInput | null> | null;
  primaryId?: ModelIDInput | null;
  primarySkOne?: ModelIDInput | null;
  primarySkTwo?: ModelIDInput | null;
  updatedAt?: ModelStringInput | null;
};

export type ModelRelatedOneCPKSKTwoConnection = {
  items: Array<RelatedOneCPKSKTwo | null>;
  nextToken?: string | null;
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

export type ModelPrimaryCPKSKOneConditionInput = {
  and?: Array<ModelPrimaryCPKSKOneConditionInput | null> | null;
  createdAt?: ModelStringInput | null;
  not?: ModelPrimaryCPKSKOneConditionInput | null;
  or?: Array<ModelPrimaryCPKSKOneConditionInput | null> | null;
  updatedAt?: ModelStringInput | null;
};

export type CreatePrimaryCPKSKOneInput = {
  id?: string | null;
  skOne: string;
};

export type ModelPrimaryCPKSKTwoConditionInput = {
  and?: Array<ModelPrimaryCPKSKTwoConditionInput | null> | null;
  createdAt?: ModelStringInput | null;
  not?: ModelPrimaryCPKSKTwoConditionInput | null;
  or?: Array<ModelPrimaryCPKSKTwoConditionInput | null> | null;
  updatedAt?: ModelStringInput | null;
};

export type CreatePrimaryCPKSKTwoInput = {
  id?: string | null;
  skOne: string;
  skTwo: string;
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

export type ModelRelatedManyCPKSKOneConditionInput = {
  and?: Array<ModelRelatedManyCPKSKOneConditionInput | null> | null;
  createdAt?: ModelStringInput | null;
  not?: ModelRelatedManyCPKSKOneConditionInput | null;
  or?: Array<ModelRelatedManyCPKSKOneConditionInput | null> | null;
  primaryId?: ModelIDInput | null;
  primarySkOne?: ModelIDInput | null;
  updatedAt?: ModelStringInput | null;
};

export type CreateRelatedManyCPKSKOneInput = {
  id?: string | null;
  primaryId?: string | null;
  primarySkOne?: string | null;
};

export type ModelRelatedManyCPKSKTwoConditionInput = {
  and?: Array<ModelRelatedManyCPKSKTwoConditionInput | null> | null;
  createdAt?: ModelStringInput | null;
  not?: ModelRelatedManyCPKSKTwoConditionInput | null;
  or?: Array<ModelRelatedManyCPKSKTwoConditionInput | null> | null;
  primaryId?: ModelIDInput | null;
  primarySkOne?: ModelIDInput | null;
  primarySkTwo?: ModelIDInput | null;
  updatedAt?: ModelStringInput | null;
};

export type CreateRelatedManyCPKSKTwoInput = {
  id?: string | null;
  primaryId?: string | null;
  primarySkOne?: string | null;
  primarySkTwo?: string | null;
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

export type ModelRelatedOneCPKSKOneConditionInput = {
  and?: Array<ModelRelatedOneCPKSKOneConditionInput | null> | null;
  createdAt?: ModelStringInput | null;
  not?: ModelRelatedOneCPKSKOneConditionInput | null;
  or?: Array<ModelRelatedOneCPKSKOneConditionInput | null> | null;
  primaryId?: ModelIDInput | null;
  primarySkOne?: ModelIDInput | null;
  updatedAt?: ModelStringInput | null;
};

export type CreateRelatedOneCPKSKOneInput = {
  id?: string | null;
  primaryId?: string | null;
  primarySkOne?: string | null;
};

export type ModelRelatedOneCPKSKTwoConditionInput = {
  and?: Array<ModelRelatedOneCPKSKTwoConditionInput | null> | null;
  createdAt?: ModelStringInput | null;
  not?: ModelRelatedOneCPKSKTwoConditionInput | null;
  or?: Array<ModelRelatedOneCPKSKTwoConditionInput | null> | null;
  primaryId?: ModelIDInput | null;
  primarySkOne?: ModelIDInput | null;
  primarySkTwo?: ModelIDInput | null;
  updatedAt?: ModelStringInput | null;
};

export type CreateRelatedOneCPKSKTwoInput = {
  id?: string | null;
  primaryId?: string | null;
  primarySkOne?: string | null;
  primarySkTwo?: string | null;
};

export type DeletePrimaryInput = {
  id: string;
};

export type DeletePrimaryCPKSKOneInput = {
  id: string;
  skOne: string;
};

export type DeletePrimaryCPKSKTwoInput = {
  id: string;
  skOne: string;
  skTwo: string;
};

export type DeleteRelatedManyInput = {
  id: string;
};

export type DeleteRelatedManyCPKSKOneInput = {
  id: string;
};

export type DeleteRelatedManyCPKSKTwoInput = {
  id: string;
};

export type DeleteRelatedOneInput = {
  id: string;
};

export type DeleteRelatedOneCPKSKOneInput = {
  id: string;
};

export type DeleteRelatedOneCPKSKTwoInput = {
  id: string;
};

export type UpdatePrimaryInput = {
  id: string;
};

export type UpdatePrimaryCPKSKOneInput = {
  id: string;
  skOne: string;
};

export type UpdatePrimaryCPKSKTwoInput = {
  id: string;
  skOne: string;
  skTwo: string;
};

export type UpdateRelatedManyInput = {
  id: string;
  primaryId?: string | null;
};

export type UpdateRelatedManyCPKSKOneInput = {
  id: string;
  primaryId?: string | null;
  primarySkOne?: string | null;
};

export type UpdateRelatedManyCPKSKTwoInput = {
  id: string;
  primaryId?: string | null;
  primarySkOne?: string | null;
  primarySkTwo?: string | null;
};

export type UpdateRelatedOneInput = {
  id: string;
  primaryId?: string | null;
};

export type UpdateRelatedOneCPKSKOneInput = {
  id: string;
  primaryId?: string | null;
  primarySkOne?: string | null;
};

export type UpdateRelatedOneCPKSKTwoInput = {
  id: string;
  primaryId?: string | null;
  primarySkOne?: string | null;
  primarySkTwo?: string | null;
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

export type ModelSubscriptionPrimaryCPKSKOneFilterInput = {
  and?: Array<ModelSubscriptionPrimaryCPKSKOneFilterInput | null> | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionIDInput | null;
  or?: Array<ModelSubscriptionPrimaryCPKSKOneFilterInput | null> | null;
  skOne?: ModelSubscriptionIDInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
};

export type ModelSubscriptionPrimaryCPKSKTwoFilterInput = {
  and?: Array<ModelSubscriptionPrimaryCPKSKTwoFilterInput | null> | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionIDInput | null;
  or?: Array<ModelSubscriptionPrimaryCPKSKTwoFilterInput | null> | null;
  skOne?: ModelSubscriptionIDInput | null;
  skTwo?: ModelSubscriptionIDInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
};

export type ModelSubscriptionRelatedManyFilterInput = {
  and?: Array<ModelSubscriptionRelatedManyFilterInput | null> | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionIDInput | null;
  or?: Array<ModelSubscriptionRelatedManyFilterInput | null> | null;
  primaryId?: ModelSubscriptionStringInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
};

export type ModelSubscriptionRelatedManyCPKSKOneFilterInput = {
  and?: Array<ModelSubscriptionRelatedManyCPKSKOneFilterInput | null> | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionStringInput | null;
  or?: Array<ModelSubscriptionRelatedManyCPKSKOneFilterInput | null> | null;
  primaryId?: ModelSubscriptionIDInput | null;
  primarySkOne?: ModelSubscriptionIDInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
};

export type ModelSubscriptionRelatedManyCPKSKTwoFilterInput = {
  and?: Array<ModelSubscriptionRelatedManyCPKSKTwoFilterInput | null> | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionStringInput | null;
  or?: Array<ModelSubscriptionRelatedManyCPKSKTwoFilterInput | null> | null;
  primaryId?: ModelSubscriptionIDInput | null;
  primarySkOne?: ModelSubscriptionIDInput | null;
  primarySkTwo?: ModelSubscriptionIDInput | null;
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

export type ModelSubscriptionRelatedOneCPKSKOneFilterInput = {
  and?: Array<ModelSubscriptionRelatedOneCPKSKOneFilterInput | null> | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionStringInput | null;
  or?: Array<ModelSubscriptionRelatedOneCPKSKOneFilterInput | null> | null;
  primaryId?: ModelSubscriptionIDInput | null;
  primarySkOne?: ModelSubscriptionIDInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
};

export type ModelSubscriptionRelatedOneCPKSKTwoFilterInput = {
  and?: Array<ModelSubscriptionRelatedOneCPKSKTwoFilterInput | null> | null;
  createdAt?: ModelSubscriptionStringInput | null;
  id?: ModelSubscriptionStringInput | null;
  or?: Array<ModelSubscriptionRelatedOneCPKSKTwoFilterInput | null> | null;
  primaryId?: ModelSubscriptionIDInput | null;
  primarySkOne?: ModelSubscriptionIDInput | null;
  primarySkTwo?: ModelSubscriptionIDInput | null;
  updatedAt?: ModelSubscriptionStringInput | null;
};

export type GetPrimaryQueryVariables = {
  id: string;
};

export type GetPrimaryQuery = {
  getPrimary?: {
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

export type GetPrimaryCPKSKOneQueryVariables = {
  id: string;
  skOne: string;
};

export type GetPrimaryCPKSKOneQuery = {
  getPrimaryCPKSKOne?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
    } | null;
    skOne: string;
  } | null;
};

export type GetPrimaryCPKSKTwoQueryVariables = {
  id: string;
  skOne: string;
  skTwo: string;
};

export type GetPrimaryCPKSKTwoQuery = {
  getPrimaryCPKSKTwo?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
      primarySkTwo?: string | null;
    } | null;
    skOne: string;
    skTwo: string;
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

export type GetRelatedManyCPKSKOneQueryVariables = {
  id: string;
};

export type GetRelatedManyCPKSKOneQuery = {
  getRelatedManyCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type GetRelatedManyCPKSKTwoQueryVariables = {
  id: string;
};

export type GetRelatedManyCPKSKTwoQuery = {
  getRelatedManyCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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

export type GetRelatedOneCPKSKOneQueryVariables = {
  id: string;
};

export type GetRelatedOneCPKSKOneQuery = {
  getRelatedOneCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type GetRelatedOneCPKSKTwoQueryVariables = {
  id: string;
};

export type GetRelatedOneCPKSKTwoQuery = {
  getRelatedOneCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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

export type ListPrimaryCPKSKOnesQueryVariables = {
  filter?: ModelPrimaryCPKSKOneFilterInput | null;
  id?: string | null;
  limit?: number | null;
  nextToken?: string | null;
  skOne?: ModelIDKeyConditionInput | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListPrimaryCPKSKOnesQuery = {
  listPrimaryCPKSKOnes?: {
    items: Array<{
      id: string;
      skOne: string;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type ListPrimaryCPKSKTwosQueryVariables = {
  filter?: ModelPrimaryCPKSKTwoFilterInput | null;
  id?: string | null;
  limit?: number | null;
  nextToken?: string | null;
  skOneSkTwo?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyConditionInput | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListPrimaryCPKSKTwosQuery = {
  listPrimaryCPKSKTwos?: {
    items: Array<{
      id: string;
      skOne: string;
      skTwo: string;
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

export type ListRelatedManyCPKSKOnesQueryVariables = {
  filter?: ModelRelatedManyCPKSKOneFilterInput | null;
  id?: string | null;
  limit?: number | null;
  nextToken?: string | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListRelatedManyCPKSKOnesQuery = {
  listRelatedManyCPKSKOnes?: {
    items: Array<{
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type ListRelatedManyCPKSKTwosQueryVariables = {
  filter?: ModelRelatedManyCPKSKTwoFilterInput | null;
  id?: string | null;
  limit?: number | null;
  nextToken?: string | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListRelatedManyCPKSKTwosQuery = {
  listRelatedManyCPKSKTwos?: {
    items: Array<{
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
      primarySkTwo?: string | null;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type ListRelatedOneCPKSKOnesQueryVariables = {
  filter?: ModelRelatedOneCPKSKOneFilterInput | null;
  id?: string | null;
  limit?: number | null;
  nextToken?: string | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListRelatedOneCPKSKOnesQuery = {
  listRelatedOneCPKSKOnes?: {
    items: Array<{
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type ListRelatedOneCPKSKTwosQueryVariables = {
  filter?: ModelRelatedOneCPKSKTwoFilterInput | null;
  id?: string | null;
  limit?: number | null;
  nextToken?: string | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListRelatedOneCPKSKTwosQuery = {
  listRelatedOneCPKSKTwos?: {
    items: Array<{
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
      primarySkTwo?: string | null;
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
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
    } | null;
  } | null;
};

export type CreatePrimaryCPKSKOneMutationVariables = {
  condition?: ModelPrimaryCPKSKOneConditionInput | null;
  input: CreatePrimaryCPKSKOneInput;
};

export type CreatePrimaryCPKSKOneMutation = {
  createPrimaryCPKSKOne?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
    } | null;
    skOne: string;
  } | null;
};

export type CreatePrimaryCPKSKTwoMutationVariables = {
  condition?: ModelPrimaryCPKSKTwoConditionInput | null;
  input: CreatePrimaryCPKSKTwoInput;
};

export type CreatePrimaryCPKSKTwoMutation = {
  createPrimaryCPKSKTwo?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
      primarySkTwo?: string | null;
    } | null;
    skOne: string;
    skTwo: string;
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

export type CreateRelatedManyCPKSKOneMutationVariables = {
  condition?: ModelRelatedManyCPKSKOneConditionInput | null;
  input: CreateRelatedManyCPKSKOneInput;
};

export type CreateRelatedManyCPKSKOneMutation = {
  createRelatedManyCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type CreateRelatedManyCPKSKTwoMutationVariables = {
  condition?: ModelRelatedManyCPKSKTwoConditionInput | null;
  input: CreateRelatedManyCPKSKTwoInput;
};

export type CreateRelatedManyCPKSKTwoMutation = {
  createRelatedManyCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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

export type CreateRelatedOneCPKSKOneMutationVariables = {
  condition?: ModelRelatedOneCPKSKOneConditionInput | null;
  input: CreateRelatedOneCPKSKOneInput;
};

export type CreateRelatedOneCPKSKOneMutation = {
  createRelatedOneCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type CreateRelatedOneCPKSKTwoMutationVariables = {
  condition?: ModelRelatedOneCPKSKTwoConditionInput | null;
  input: CreateRelatedOneCPKSKTwoInput;
};

export type CreateRelatedOneCPKSKTwoMutation = {
  createRelatedOneCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
    } | null;
  } | null;
};

export type DeletePrimaryCPKSKOneMutationVariables = {
  condition?: ModelPrimaryCPKSKOneConditionInput | null;
  input: DeletePrimaryCPKSKOneInput;
};

export type DeletePrimaryCPKSKOneMutation = {
  deletePrimaryCPKSKOne?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
    } | null;
    skOne: string;
  } | null;
};

export type DeletePrimaryCPKSKTwoMutationVariables = {
  condition?: ModelPrimaryCPKSKTwoConditionInput | null;
  input: DeletePrimaryCPKSKTwoInput;
};

export type DeletePrimaryCPKSKTwoMutation = {
  deletePrimaryCPKSKTwo?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
      primarySkTwo?: string | null;
    } | null;
    skOne: string;
    skTwo: string;
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

export type DeleteRelatedManyCPKSKOneMutationVariables = {
  condition?: ModelRelatedManyCPKSKOneConditionInput | null;
  input: DeleteRelatedManyCPKSKOneInput;
};

export type DeleteRelatedManyCPKSKOneMutation = {
  deleteRelatedManyCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type DeleteRelatedManyCPKSKTwoMutationVariables = {
  condition?: ModelRelatedManyCPKSKTwoConditionInput | null;
  input: DeleteRelatedManyCPKSKTwoInput;
};

export type DeleteRelatedManyCPKSKTwoMutation = {
  deleteRelatedManyCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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

export type DeleteRelatedOneCPKSKOneMutationVariables = {
  condition?: ModelRelatedOneCPKSKOneConditionInput | null;
  input: DeleteRelatedOneCPKSKOneInput;
};

export type DeleteRelatedOneCPKSKOneMutation = {
  deleteRelatedOneCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type DeleteRelatedOneCPKSKTwoMutationVariables = {
  condition?: ModelRelatedOneCPKSKTwoConditionInput | null;
  input: DeleteRelatedOneCPKSKTwoInput;
};

export type DeleteRelatedOneCPKSKTwoMutation = {
  deleteRelatedOneCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
    } | null;
  } | null;
};

export type UpdatePrimaryCPKSKOneMutationVariables = {
  condition?: ModelPrimaryCPKSKOneConditionInput | null;
  input: UpdatePrimaryCPKSKOneInput;
};

export type UpdatePrimaryCPKSKOneMutation = {
  updatePrimaryCPKSKOne?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
    } | null;
    skOne: string;
  } | null;
};

export type UpdatePrimaryCPKSKTwoMutationVariables = {
  condition?: ModelPrimaryCPKSKTwoConditionInput | null;
  input: UpdatePrimaryCPKSKTwoInput;
};

export type UpdatePrimaryCPKSKTwoMutation = {
  updatePrimaryCPKSKTwo?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
      primarySkTwo?: string | null;
    } | null;
    skOne: string;
    skTwo: string;
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

export type UpdateRelatedManyCPKSKOneMutationVariables = {
  condition?: ModelRelatedManyCPKSKOneConditionInput | null;
  input: UpdateRelatedManyCPKSKOneInput;
};

export type UpdateRelatedManyCPKSKOneMutation = {
  updateRelatedManyCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type UpdateRelatedManyCPKSKTwoMutationVariables = {
  condition?: ModelRelatedManyCPKSKTwoConditionInput | null;
  input: UpdateRelatedManyCPKSKTwoInput;
};

export type UpdateRelatedManyCPKSKTwoMutation = {
  updateRelatedManyCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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

export type UpdateRelatedOneCPKSKOneMutationVariables = {
  condition?: ModelRelatedOneCPKSKOneConditionInput | null;
  input: UpdateRelatedOneCPKSKOneInput;
};

export type UpdateRelatedOneCPKSKOneMutation = {
  updateRelatedOneCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type UpdateRelatedOneCPKSKTwoMutationVariables = {
  condition?: ModelRelatedOneCPKSKTwoConditionInput | null;
  input: UpdateRelatedOneCPKSKTwoInput;
};

export type UpdateRelatedOneCPKSKTwoMutation = {
  updateRelatedOneCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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

export type OnCreatePrimaryCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKOneFilterInput | null;
};

export type OnCreatePrimaryCPKSKOneSubscription = {
  onCreatePrimaryCPKSKOne?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
    } | null;
    skOne: string;
  } | null;
};

export type OnCreatePrimaryCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKTwoFilterInput | null;
};

export type OnCreatePrimaryCPKSKTwoSubscription = {
  onCreatePrimaryCPKSKTwo?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
      primarySkTwo?: string | null;
    } | null;
    skOne: string;
    skTwo: string;
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

export type OnCreateRelatedManyCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKOneFilterInput | null;
};

export type OnCreateRelatedManyCPKSKOneSubscription = {
  onCreateRelatedManyCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type OnCreateRelatedManyCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKTwoFilterInput | null;
};

export type OnCreateRelatedManyCPKSKTwoSubscription = {
  onCreateRelatedManyCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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

export type OnCreateRelatedOneCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKOneFilterInput | null;
};

export type OnCreateRelatedOneCPKSKOneSubscription = {
  onCreateRelatedOneCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type OnCreateRelatedOneCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKTwoFilterInput | null;
};

export type OnCreateRelatedOneCPKSKTwoSubscription = {
  onCreateRelatedOneCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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

export type OnDeletePrimaryCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKOneFilterInput | null;
};

export type OnDeletePrimaryCPKSKOneSubscription = {
  onDeletePrimaryCPKSKOne?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
    } | null;
    skOne: string;
  } | null;
};

export type OnDeletePrimaryCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKTwoFilterInput | null;
};

export type OnDeletePrimaryCPKSKTwoSubscription = {
  onDeletePrimaryCPKSKTwo?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
      primarySkTwo?: string | null;
    } | null;
    skOne: string;
    skTwo: string;
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

export type OnDeleteRelatedManyCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKOneFilterInput | null;
};

export type OnDeleteRelatedManyCPKSKOneSubscription = {
  onDeleteRelatedManyCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type OnDeleteRelatedManyCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKTwoFilterInput | null;
};

export type OnDeleteRelatedManyCPKSKTwoSubscription = {
  onDeleteRelatedManyCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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

export type OnDeleteRelatedOneCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKOneFilterInput | null;
};

export type OnDeleteRelatedOneCPKSKOneSubscription = {
  onDeleteRelatedOneCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type OnDeleteRelatedOneCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKTwoFilterInput | null;
};

export type OnDeleteRelatedOneCPKSKTwoSubscription = {
  onDeleteRelatedOneCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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

export type OnUpdatePrimaryCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKOneFilterInput | null;
};

export type OnUpdatePrimaryCPKSKOneSubscription = {
  onUpdatePrimaryCPKSKOne?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
    } | null;
    skOne: string;
  } | null;
};

export type OnUpdatePrimaryCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKTwoFilterInput | null;
};

export type OnUpdatePrimaryCPKSKTwoSubscription = {
  onUpdatePrimaryCPKSKTwo?: {
    id: string;
    relatedMany?: {
      nextToken?: string | null;
    } | null;
    relatedOne?: {
      id: string;
      primaryId?: string | null;
      primarySkOne?: string | null;
      primarySkTwo?: string | null;
    } | null;
    skOne: string;
    skTwo: string;
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

export type OnUpdateRelatedManyCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKOneFilterInput | null;
};

export type OnUpdateRelatedManyCPKSKOneSubscription = {
  onUpdateRelatedManyCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type OnUpdateRelatedManyCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKTwoFilterInput | null;
};

export type OnUpdateRelatedManyCPKSKTwoSubscription = {
  onUpdateRelatedManyCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
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

export type OnUpdateRelatedOneCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKOneFilterInput | null;
};

export type OnUpdateRelatedOneCPKSKOneSubscription = {
  onUpdateRelatedOneCPKSKOne?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
  } | null;
};

export type OnUpdateRelatedOneCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKTwoFilterInput | null;
};

export type OnUpdateRelatedOneCPKSKTwoSubscription = {
  onUpdateRelatedOneCPKSKTwo?: {
    id: string;
    primary?: {
      id: string;
      skOne: string;
      skTwo: string;
    } | null;
    primaryId?: string | null;
    primarySkOne?: string | null;
    primarySkTwo?: string | null;
  } | null;
};
