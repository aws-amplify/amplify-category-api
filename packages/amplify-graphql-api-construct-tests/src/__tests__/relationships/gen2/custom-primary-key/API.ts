/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type PrimaryCPKSKFour = {
  __typename: "PrimaryCPKSKFour",
  createdAt: string,
  id: string,
  relatedMany?: ModelRelatedManyCPKSKFourConnection | null,
  relatedOne?: RelatedOneCPKSKFour | null,
  skFour: string,
  skOne: string,
  skThree: string,
  skTwo: string,
  updatedAt: string,
};

export type ModelRelatedManyCPKSKFourConnection = {
  __typename: "ModelRelatedManyCPKSKFourConnection",
  items:  Array<RelatedManyCPKSKFour | null >,
  nextToken?: string | null,
};

export type RelatedManyCPKSKFour = {
  __typename: "RelatedManyCPKSKFour",
  createdAt: string,
  id: string,
  primary?: PrimaryCPKSKFour | null,
  primaryId?: string | null,
  primarySkFour?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
  updatedAt: string,
};

export type RelatedOneCPKSKFour = {
  __typename: "RelatedOneCPKSKFour",
  createdAt: string,
  id: string,
  primary?: PrimaryCPKSKFour | null,
  primaryId?: string | null,
  primarySkFour?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
  updatedAt: string,
};

export type PrimaryCPKSKOne = {
  __typename: "PrimaryCPKSKOne",
  createdAt: string,
  id: string,
  relatedMany?: ModelRelatedManyCPKSKOneConnection | null,
  relatedOne?: RelatedOneCPKSKOne | null,
  skOne: string,
  updatedAt: string,
};

export type ModelRelatedManyCPKSKOneConnection = {
  __typename: "ModelRelatedManyCPKSKOneConnection",
  items:  Array<RelatedManyCPKSKOne | null >,
  nextToken?: string | null,
};

export type RelatedManyCPKSKOne = {
  __typename: "RelatedManyCPKSKOne",
  createdAt: string,
  id: string,
  primary?: PrimaryCPKSKOne | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
  updatedAt: string,
};

export type RelatedOneCPKSKOne = {
  __typename: "RelatedOneCPKSKOne",
  createdAt: string,
  id: string,
  primary?: PrimaryCPKSKOne | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
  updatedAt: string,
};

export type PrimaryCPKSKThree = {
  __typename: "PrimaryCPKSKThree",
  createdAt: string,
  id: string,
  relatedMany?: ModelRelatedManyCPKSKThreeConnection | null,
  relatedOne?: RelatedOneCPKSKThree | null,
  skOne: string,
  skThree: string,
  skTwo: string,
  updatedAt: string,
};

export type ModelRelatedManyCPKSKThreeConnection = {
  __typename: "ModelRelatedManyCPKSKThreeConnection",
  items:  Array<RelatedManyCPKSKThree | null >,
  nextToken?: string | null,
};

export type RelatedManyCPKSKThree = {
  __typename: "RelatedManyCPKSKThree",
  createdAt: string,
  id: string,
  primary?: PrimaryCPKSKThree | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
  updatedAt: string,
};

export type RelatedOneCPKSKThree = {
  __typename: "RelatedOneCPKSKThree",
  createdAt: string,
  id: string,
  primary?: PrimaryCPKSKThree | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
  updatedAt: string,
};

export type PrimaryCPKSKTwo = {
  __typename: "PrimaryCPKSKTwo",
  createdAt: string,
  id: string,
  relatedMany?: ModelRelatedManyCPKSKTwoConnection | null,
  relatedOne?: RelatedOneCPKSKTwo | null,
  skOne: string,
  skTwo: string,
  updatedAt: string,
};

export type ModelRelatedManyCPKSKTwoConnection = {
  __typename: "ModelRelatedManyCPKSKTwoConnection",
  items:  Array<RelatedManyCPKSKTwo | null >,
  nextToken?: string | null,
};

export type RelatedManyCPKSKTwo = {
  __typename: "RelatedManyCPKSKTwo",
  createdAt: string,
  id: string,
  primary?: PrimaryCPKSKTwo | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkTwo?: string | null,
  updatedAt: string,
};

export type RelatedOneCPKSKTwo = {
  __typename: "RelatedOneCPKSKTwo",
  createdAt: string,
  id: string,
  primary?: PrimaryCPKSKTwo | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkTwo?: string | null,
  updatedAt: string,
};

export type ModelPrimaryCPKSKFourFilterInput = {
  and?: Array< ModelPrimaryCPKSKFourFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelPrimaryCPKSKFourFilterInput | null,
  or?: Array< ModelPrimaryCPKSKFourFilterInput | null > | null,
  skFour?: ModelIDInput | null,
  skOne?: ModelIDInput | null,
  skThree?: ModelIDInput | null,
  skTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelStringInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  _null = "_null",
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
}


export type ModelSizeInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelIDInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export type ModelPrimaryCPKSKFourPrimaryCompositeKeyConditionInput = {
  beginsWith?: ModelPrimaryCPKSKFourPrimaryCompositeKeyInput | null,
  between?: Array< ModelPrimaryCPKSKFourPrimaryCompositeKeyInput | null > | null,
  eq?: ModelPrimaryCPKSKFourPrimaryCompositeKeyInput | null,
  ge?: ModelPrimaryCPKSKFourPrimaryCompositeKeyInput | null,
  gt?: ModelPrimaryCPKSKFourPrimaryCompositeKeyInput | null,
  le?: ModelPrimaryCPKSKFourPrimaryCompositeKeyInput | null,
  lt?: ModelPrimaryCPKSKFourPrimaryCompositeKeyInput | null,
};

export type ModelPrimaryCPKSKFourPrimaryCompositeKeyInput = {
  skFour?: string | null,
  skOne?: string | null,
  skThree?: string | null,
  skTwo?: string | null,
};

export enum ModelSortDirection {
  ASC = "ASC",
  DESC = "DESC",
}


export type ModelPrimaryCPKSKFourConnection = {
  __typename: "ModelPrimaryCPKSKFourConnection",
  items:  Array<PrimaryCPKSKFour | null >,
  nextToken?: string | null,
};

export type ModelPrimaryCPKSKOneFilterInput = {
  and?: Array< ModelPrimaryCPKSKOneFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelPrimaryCPKSKOneFilterInput | null,
  or?: Array< ModelPrimaryCPKSKOneFilterInput | null > | null,
  skOne?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelIDKeyConditionInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
};

export type ModelPrimaryCPKSKOneConnection = {
  __typename: "ModelPrimaryCPKSKOneConnection",
  items:  Array<PrimaryCPKSKOne | null >,
  nextToken?: string | null,
};

export type ModelPrimaryCPKSKThreeFilterInput = {
  and?: Array< ModelPrimaryCPKSKThreeFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelPrimaryCPKSKThreeFilterInput | null,
  or?: Array< ModelPrimaryCPKSKThreeFilterInput | null > | null,
  skOne?: ModelIDInput | null,
  skThree?: ModelIDInput | null,
  skTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelPrimaryCPKSKThreePrimaryCompositeKeyConditionInput = {
  beginsWith?: ModelPrimaryCPKSKThreePrimaryCompositeKeyInput | null,
  between?: Array< ModelPrimaryCPKSKThreePrimaryCompositeKeyInput | null > | null,
  eq?: ModelPrimaryCPKSKThreePrimaryCompositeKeyInput | null,
  ge?: ModelPrimaryCPKSKThreePrimaryCompositeKeyInput | null,
  gt?: ModelPrimaryCPKSKThreePrimaryCompositeKeyInput | null,
  le?: ModelPrimaryCPKSKThreePrimaryCompositeKeyInput | null,
  lt?: ModelPrimaryCPKSKThreePrimaryCompositeKeyInput | null,
};

export type ModelPrimaryCPKSKThreePrimaryCompositeKeyInput = {
  skOne?: string | null,
  skThree?: string | null,
  skTwo?: string | null,
};

export type ModelPrimaryCPKSKThreeConnection = {
  __typename: "ModelPrimaryCPKSKThreeConnection",
  items:  Array<PrimaryCPKSKThree | null >,
  nextToken?: string | null,
};

export type ModelPrimaryCPKSKTwoFilterInput = {
  and?: Array< ModelPrimaryCPKSKTwoFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  not?: ModelPrimaryCPKSKTwoFilterInput | null,
  or?: Array< ModelPrimaryCPKSKTwoFilterInput | null > | null,
  skOne?: ModelIDInput | null,
  skTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelPrimaryCPKSKTwoPrimaryCompositeKeyConditionInput = {
  beginsWith?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null,
  between?: Array< ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null > | null,
  eq?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null,
  ge?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null,
  gt?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null,
  le?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null,
  lt?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput | null,
};

export type ModelPrimaryCPKSKTwoPrimaryCompositeKeyInput = {
  skOne?: string | null,
  skTwo?: string | null,
};

export type ModelPrimaryCPKSKTwoConnection = {
  __typename: "ModelPrimaryCPKSKTwoConnection",
  items:  Array<PrimaryCPKSKTwo | null >,
  nextToken?: string | null,
};

export type ModelRelatedManyCPKSKFourFilterInput = {
  and?: Array< ModelRelatedManyCPKSKFourFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelStringInput | null,
  not?: ModelRelatedManyCPKSKFourFilterInput | null,
  or?: Array< ModelRelatedManyCPKSKFourFilterInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkFour?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkThree?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelRelatedManyCPKSKOneFilterInput = {
  and?: Array< ModelRelatedManyCPKSKOneFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelStringInput | null,
  not?: ModelRelatedManyCPKSKOneFilterInput | null,
  or?: Array< ModelRelatedManyCPKSKOneFilterInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelRelatedManyCPKSKThreeFilterInput = {
  and?: Array< ModelRelatedManyCPKSKThreeFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelStringInput | null,
  not?: ModelRelatedManyCPKSKThreeFilterInput | null,
  or?: Array< ModelRelatedManyCPKSKThreeFilterInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkThree?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelRelatedManyCPKSKTwoFilterInput = {
  and?: Array< ModelRelatedManyCPKSKTwoFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelStringInput | null,
  not?: ModelRelatedManyCPKSKTwoFilterInput | null,
  or?: Array< ModelRelatedManyCPKSKTwoFilterInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelRelatedOneCPKSKFourFilterInput = {
  and?: Array< ModelRelatedOneCPKSKFourFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelStringInput | null,
  not?: ModelRelatedOneCPKSKFourFilterInput | null,
  or?: Array< ModelRelatedOneCPKSKFourFilterInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkFour?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkThree?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelRelatedOneCPKSKFourConnection = {
  __typename: "ModelRelatedOneCPKSKFourConnection",
  items:  Array<RelatedOneCPKSKFour | null >,
  nextToken?: string | null,
};

export type ModelRelatedOneCPKSKOneFilterInput = {
  and?: Array< ModelRelatedOneCPKSKOneFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelStringInput | null,
  not?: ModelRelatedOneCPKSKOneFilterInput | null,
  or?: Array< ModelRelatedOneCPKSKOneFilterInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelRelatedOneCPKSKOneConnection = {
  __typename: "ModelRelatedOneCPKSKOneConnection",
  items:  Array<RelatedOneCPKSKOne | null >,
  nextToken?: string | null,
};

export type ModelRelatedOneCPKSKThreeFilterInput = {
  and?: Array< ModelRelatedOneCPKSKThreeFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelStringInput | null,
  not?: ModelRelatedOneCPKSKThreeFilterInput | null,
  or?: Array< ModelRelatedOneCPKSKThreeFilterInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkThree?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelRelatedOneCPKSKThreeConnection = {
  __typename: "ModelRelatedOneCPKSKThreeConnection",
  items:  Array<RelatedOneCPKSKThree | null >,
  nextToken?: string | null,
};

export type ModelRelatedOneCPKSKTwoFilterInput = {
  and?: Array< ModelRelatedOneCPKSKTwoFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelStringInput | null,
  not?: ModelRelatedOneCPKSKTwoFilterInput | null,
  or?: Array< ModelRelatedOneCPKSKTwoFilterInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelRelatedOneCPKSKTwoConnection = {
  __typename: "ModelRelatedOneCPKSKTwoConnection",
  items:  Array<RelatedOneCPKSKTwo | null >,
  nextToken?: string | null,
};

export type ModelPrimaryCPKSKFourConditionInput = {
  and?: Array< ModelPrimaryCPKSKFourConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelPrimaryCPKSKFourConditionInput | null,
  or?: Array< ModelPrimaryCPKSKFourConditionInput | null > | null,
  updatedAt?: ModelStringInput | null,
};

export type CreatePrimaryCPKSKFourInput = {
  id?: string | null,
  skFour: string,
  skOne: string,
  skThree: string,
  skTwo: string,
};

export type ModelPrimaryCPKSKOneConditionInput = {
  and?: Array< ModelPrimaryCPKSKOneConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelPrimaryCPKSKOneConditionInput | null,
  or?: Array< ModelPrimaryCPKSKOneConditionInput | null > | null,
  updatedAt?: ModelStringInput | null,
};

export type CreatePrimaryCPKSKOneInput = {
  id?: string | null,
  skOne: string,
};

export type ModelPrimaryCPKSKThreeConditionInput = {
  and?: Array< ModelPrimaryCPKSKThreeConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelPrimaryCPKSKThreeConditionInput | null,
  or?: Array< ModelPrimaryCPKSKThreeConditionInput | null > | null,
  updatedAt?: ModelStringInput | null,
};

export type CreatePrimaryCPKSKThreeInput = {
  id?: string | null,
  skOne: string,
  skThree: string,
  skTwo: string,
};

export type ModelPrimaryCPKSKTwoConditionInput = {
  and?: Array< ModelPrimaryCPKSKTwoConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelPrimaryCPKSKTwoConditionInput | null,
  or?: Array< ModelPrimaryCPKSKTwoConditionInput | null > | null,
  updatedAt?: ModelStringInput | null,
};

export type CreatePrimaryCPKSKTwoInput = {
  id?: string | null,
  skOne: string,
  skTwo: string,
};

export type ModelRelatedManyCPKSKFourConditionInput = {
  and?: Array< ModelRelatedManyCPKSKFourConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelRelatedManyCPKSKFourConditionInput | null,
  or?: Array< ModelRelatedManyCPKSKFourConditionInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkFour?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkThree?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateRelatedManyCPKSKFourInput = {
  id?: string | null,
  primaryId?: string | null,
  primarySkFour?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
};

export type ModelRelatedManyCPKSKOneConditionInput = {
  and?: Array< ModelRelatedManyCPKSKOneConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelRelatedManyCPKSKOneConditionInput | null,
  or?: Array< ModelRelatedManyCPKSKOneConditionInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateRelatedManyCPKSKOneInput = {
  id?: string | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
};

export type ModelRelatedManyCPKSKThreeConditionInput = {
  and?: Array< ModelRelatedManyCPKSKThreeConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelRelatedManyCPKSKThreeConditionInput | null,
  or?: Array< ModelRelatedManyCPKSKThreeConditionInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkThree?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateRelatedManyCPKSKThreeInput = {
  id?: string | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
};

export type ModelRelatedManyCPKSKTwoConditionInput = {
  and?: Array< ModelRelatedManyCPKSKTwoConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelRelatedManyCPKSKTwoConditionInput | null,
  or?: Array< ModelRelatedManyCPKSKTwoConditionInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateRelatedManyCPKSKTwoInput = {
  id?: string | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkTwo?: string | null,
};

export type ModelRelatedOneCPKSKFourConditionInput = {
  and?: Array< ModelRelatedOneCPKSKFourConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelRelatedOneCPKSKFourConditionInput | null,
  or?: Array< ModelRelatedOneCPKSKFourConditionInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkFour?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkThree?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateRelatedOneCPKSKFourInput = {
  id?: string | null,
  primaryId?: string | null,
  primarySkFour?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
};

export type ModelRelatedOneCPKSKOneConditionInput = {
  and?: Array< ModelRelatedOneCPKSKOneConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelRelatedOneCPKSKOneConditionInput | null,
  or?: Array< ModelRelatedOneCPKSKOneConditionInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateRelatedOneCPKSKOneInput = {
  id?: string | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
};

export type ModelRelatedOneCPKSKThreeConditionInput = {
  and?: Array< ModelRelatedOneCPKSKThreeConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelRelatedOneCPKSKThreeConditionInput | null,
  or?: Array< ModelRelatedOneCPKSKThreeConditionInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkThree?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateRelatedOneCPKSKThreeInput = {
  id?: string | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
};

export type ModelRelatedOneCPKSKTwoConditionInput = {
  and?: Array< ModelRelatedOneCPKSKTwoConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  not?: ModelRelatedOneCPKSKTwoConditionInput | null,
  or?: Array< ModelRelatedOneCPKSKTwoConditionInput | null > | null,
  primaryId?: ModelIDInput | null,
  primarySkOne?: ModelIDInput | null,
  primarySkTwo?: ModelIDInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateRelatedOneCPKSKTwoInput = {
  id?: string | null,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkTwo?: string | null,
};

export type DeletePrimaryCPKSKFourInput = {
  id: string,
  skFour: string,
  skOne: string,
  skThree: string,
  skTwo: string,
};

export type DeletePrimaryCPKSKOneInput = {
  id: string,
  skOne: string,
};

export type DeletePrimaryCPKSKThreeInput = {
  id: string,
  skOne: string,
  skThree: string,
  skTwo: string,
};

export type DeletePrimaryCPKSKTwoInput = {
  id: string,
  skOne: string,
  skTwo: string,
};

export type DeleteRelatedManyCPKSKFourInput = {
  id: string,
};

export type DeleteRelatedManyCPKSKOneInput = {
  id: string,
};

export type DeleteRelatedManyCPKSKThreeInput = {
  id: string,
};

export type DeleteRelatedManyCPKSKTwoInput = {
  id: string,
};

export type DeleteRelatedOneCPKSKFourInput = {
  id: string,
};

export type DeleteRelatedOneCPKSKOneInput = {
  id: string,
};

export type DeleteRelatedOneCPKSKThreeInput = {
  id: string,
};

export type DeleteRelatedOneCPKSKTwoInput = {
  id: string,
};

export type UpdatePrimaryCPKSKFourInput = {
  id: string,
  skFour: string,
  skOne: string,
  skThree: string,
  skTwo: string,
};

export type UpdatePrimaryCPKSKOneInput = {
  id: string,
  skOne: string,
};

export type UpdatePrimaryCPKSKThreeInput = {
  id: string,
  skOne: string,
  skThree: string,
  skTwo: string,
};

export type UpdatePrimaryCPKSKTwoInput = {
  id: string,
  skOne: string,
  skTwo: string,
};

export type UpdateRelatedManyCPKSKFourInput = {
  id: string,
  primaryId?: string | null,
  primarySkFour?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
};

export type UpdateRelatedManyCPKSKOneInput = {
  id: string,
  primaryId?: string | null,
  primarySkOne?: string | null,
};

export type UpdateRelatedManyCPKSKThreeInput = {
  id: string,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
};

export type UpdateRelatedManyCPKSKTwoInput = {
  id: string,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkTwo?: string | null,
};

export type UpdateRelatedOneCPKSKFourInput = {
  id: string,
  primaryId?: string | null,
  primarySkFour?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
};

export type UpdateRelatedOneCPKSKOneInput = {
  id: string,
  primaryId?: string | null,
  primarySkOne?: string | null,
};

export type UpdateRelatedOneCPKSKThreeInput = {
  id: string,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkThree?: string | null,
  primarySkTwo?: string | null,
};

export type UpdateRelatedOneCPKSKTwoInput = {
  id: string,
  primaryId?: string | null,
  primarySkOne?: string | null,
  primarySkTwo?: string | null,
};

export type ModelSubscriptionPrimaryCPKSKFourFilterInput = {
  and?: Array< ModelSubscriptionPrimaryCPKSKFourFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionPrimaryCPKSKFourFilterInput | null > | null,
  skFour?: ModelSubscriptionIDInput | null,
  skOne?: ModelSubscriptionIDInput | null,
  skThree?: ModelSubscriptionIDInput | null,
  skTwo?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionPrimaryCPKSKOneFilterInput = {
  and?: Array< ModelSubscriptionPrimaryCPKSKOneFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionPrimaryCPKSKOneFilterInput | null > | null,
  skOne?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionPrimaryCPKSKThreeFilterInput = {
  and?: Array< ModelSubscriptionPrimaryCPKSKThreeFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionPrimaryCPKSKThreeFilterInput | null > | null,
  skOne?: ModelSubscriptionIDInput | null,
  skThree?: ModelSubscriptionIDInput | null,
  skTwo?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionPrimaryCPKSKTwoFilterInput = {
  and?: Array< ModelSubscriptionPrimaryCPKSKTwoFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  or?: Array< ModelSubscriptionPrimaryCPKSKTwoFilterInput | null > | null,
  skOne?: ModelSubscriptionIDInput | null,
  skTwo?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionRelatedManyCPKSKFourFilterInput = {
  and?: Array< ModelSubscriptionRelatedManyCPKSKFourFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionRelatedManyCPKSKFourFilterInput | null > | null,
  primaryId?: ModelSubscriptionIDInput | null,
  primarySkFour?: ModelSubscriptionIDInput | null,
  primarySkOne?: ModelSubscriptionIDInput | null,
  primarySkThree?: ModelSubscriptionIDInput | null,
  primarySkTwo?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionRelatedManyCPKSKOneFilterInput = {
  and?: Array< ModelSubscriptionRelatedManyCPKSKOneFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionRelatedManyCPKSKOneFilterInput | null > | null,
  primaryId?: ModelSubscriptionIDInput | null,
  primarySkOne?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionRelatedManyCPKSKThreeFilterInput = {
  and?: Array< ModelSubscriptionRelatedManyCPKSKThreeFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionRelatedManyCPKSKThreeFilterInput | null > | null,
  primaryId?: ModelSubscriptionIDInput | null,
  primarySkOne?: ModelSubscriptionIDInput | null,
  primarySkThree?: ModelSubscriptionIDInput | null,
  primarySkTwo?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionRelatedManyCPKSKTwoFilterInput = {
  and?: Array< ModelSubscriptionRelatedManyCPKSKTwoFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionRelatedManyCPKSKTwoFilterInput | null > | null,
  primaryId?: ModelSubscriptionIDInput | null,
  primarySkOne?: ModelSubscriptionIDInput | null,
  primarySkTwo?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionRelatedOneCPKSKFourFilterInput = {
  and?: Array< ModelSubscriptionRelatedOneCPKSKFourFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionRelatedOneCPKSKFourFilterInput | null > | null,
  primaryId?: ModelSubscriptionIDInput | null,
  primarySkFour?: ModelSubscriptionIDInput | null,
  primarySkOne?: ModelSubscriptionIDInput | null,
  primarySkThree?: ModelSubscriptionIDInput | null,
  primarySkTwo?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionRelatedOneCPKSKOneFilterInput = {
  and?: Array< ModelSubscriptionRelatedOneCPKSKOneFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionRelatedOneCPKSKOneFilterInput | null > | null,
  primaryId?: ModelSubscriptionIDInput | null,
  primarySkOne?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionRelatedOneCPKSKThreeFilterInput = {
  and?: Array< ModelSubscriptionRelatedOneCPKSKThreeFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionRelatedOneCPKSKThreeFilterInput | null > | null,
  primaryId?: ModelSubscriptionIDInput | null,
  primarySkOne?: ModelSubscriptionIDInput | null,
  primarySkThree?: ModelSubscriptionIDInput | null,
  primarySkTwo?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionRelatedOneCPKSKTwoFilterInput = {
  and?: Array< ModelSubscriptionRelatedOneCPKSKTwoFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionRelatedOneCPKSKTwoFilterInput | null > | null,
  primaryId?: ModelSubscriptionIDInput | null,
  primarySkOne?: ModelSubscriptionIDInput | null,
  primarySkTwo?: ModelSubscriptionIDInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type GetPrimaryCPKSKFourQueryVariables = {
  id: string,
  skFour: string,
  skOne: string,
  skThree: string,
  skTwo: string,
};

export type GetPrimaryCPKSKFourQuery = {
  getPrimaryCPKSKFour?:  {
    __typename: "PrimaryCPKSKFour",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKFourConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKFour",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkFour?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skFour: string,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type GetPrimaryCPKSKOneQueryVariables = {
  id: string,
  skOne: string,
};

export type GetPrimaryCPKSKOneQuery = {
  getPrimaryCPKSKOne?:  {
    __typename: "PrimaryCPKSKOne",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKOneConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKOne",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    updatedAt: string,
  } | null,
};

export type GetPrimaryCPKSKThreeQueryVariables = {
  id: string,
  skOne: string,
  skThree: string,
  skTwo: string,
};

export type GetPrimaryCPKSKThreeQuery = {
  getPrimaryCPKSKThree?:  {
    __typename: "PrimaryCPKSKThree",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKThreeConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKThree",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type GetPrimaryCPKSKTwoQueryVariables = {
  id: string,
  skOne: string,
  skTwo: string,
};

export type GetPrimaryCPKSKTwoQuery = {
  getPrimaryCPKSKTwo?:  {
    __typename: "PrimaryCPKSKTwo",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKTwoConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKTwo",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type GetRelatedManyCPKSKFourQueryVariables = {
  id: string,
};

export type GetRelatedManyCPKSKFourQuery = {
  getRelatedManyCPKSKFour?:  {
    __typename: "RelatedManyCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type GetRelatedManyCPKSKOneQueryVariables = {
  id: string,
};

export type GetRelatedManyCPKSKOneQuery = {
  getRelatedManyCPKSKOne?:  {
    __typename: "RelatedManyCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type GetRelatedManyCPKSKThreeQueryVariables = {
  id: string,
};

export type GetRelatedManyCPKSKThreeQuery = {
  getRelatedManyCPKSKThree?:  {
    __typename: "RelatedManyCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type GetRelatedManyCPKSKTwoQueryVariables = {
  id: string,
};

export type GetRelatedManyCPKSKTwoQuery = {
  getRelatedManyCPKSKTwo?:  {
    __typename: "RelatedManyCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type GetRelatedOneCPKSKFourQueryVariables = {
  id: string,
};

export type GetRelatedOneCPKSKFourQuery = {
  getRelatedOneCPKSKFour?:  {
    __typename: "RelatedOneCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type GetRelatedOneCPKSKOneQueryVariables = {
  id: string,
};

export type GetRelatedOneCPKSKOneQuery = {
  getRelatedOneCPKSKOne?:  {
    __typename: "RelatedOneCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type GetRelatedOneCPKSKThreeQueryVariables = {
  id: string,
};

export type GetRelatedOneCPKSKThreeQuery = {
  getRelatedOneCPKSKThree?:  {
    __typename: "RelatedOneCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type GetRelatedOneCPKSKTwoQueryVariables = {
  id: string,
};

export type GetRelatedOneCPKSKTwoQuery = {
  getRelatedOneCPKSKTwo?:  {
    __typename: "RelatedOneCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type ListPrimaryCPKSKFoursQueryVariables = {
  filter?: ModelPrimaryCPKSKFourFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  skOneSkTwoSkThreeSkFour?: ModelPrimaryCPKSKFourPrimaryCompositeKeyConditionInput | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListPrimaryCPKSKFoursQuery = {
  listPrimaryCPKSKFours?:  {
    __typename: "ModelPrimaryCPKSKFourConnection",
    items:  Array< {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListPrimaryCPKSKOnesQueryVariables = {
  filter?: ModelPrimaryCPKSKOneFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  skOne?: ModelIDKeyConditionInput | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListPrimaryCPKSKOnesQuery = {
  listPrimaryCPKSKOnes?:  {
    __typename: "ModelPrimaryCPKSKOneConnection",
    items:  Array< {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListPrimaryCPKSKThreesQueryVariables = {
  filter?: ModelPrimaryCPKSKThreeFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  skOneSkTwoSkThree?: ModelPrimaryCPKSKThreePrimaryCompositeKeyConditionInput | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListPrimaryCPKSKThreesQuery = {
  listPrimaryCPKSKThrees?:  {
    __typename: "ModelPrimaryCPKSKThreeConnection",
    items:  Array< {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListPrimaryCPKSKTwosQueryVariables = {
  filter?: ModelPrimaryCPKSKTwoFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  skOneSkTwo?: ModelPrimaryCPKSKTwoPrimaryCompositeKeyConditionInput | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListPrimaryCPKSKTwosQuery = {
  listPrimaryCPKSKTwos?:  {
    __typename: "ModelPrimaryCPKSKTwoConnection",
    items:  Array< {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListRelatedManyCPKSKFoursQueryVariables = {
  filter?: ModelRelatedManyCPKSKFourFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListRelatedManyCPKSKFoursQuery = {
  listRelatedManyCPKSKFours?:  {
    __typename: "ModelRelatedManyCPKSKFourConnection",
    items:  Array< {
      __typename: "RelatedManyCPKSKFour",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkFour?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListRelatedManyCPKSKOnesQueryVariables = {
  filter?: ModelRelatedManyCPKSKOneFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListRelatedManyCPKSKOnesQuery = {
  listRelatedManyCPKSKOnes?:  {
    __typename: "ModelRelatedManyCPKSKOneConnection",
    items:  Array< {
      __typename: "RelatedManyCPKSKOne",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListRelatedManyCPKSKThreesQueryVariables = {
  filter?: ModelRelatedManyCPKSKThreeFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListRelatedManyCPKSKThreesQuery = {
  listRelatedManyCPKSKThrees?:  {
    __typename: "ModelRelatedManyCPKSKThreeConnection",
    items:  Array< {
      __typename: "RelatedManyCPKSKThree",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListRelatedManyCPKSKTwosQueryVariables = {
  filter?: ModelRelatedManyCPKSKTwoFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListRelatedManyCPKSKTwosQuery = {
  listRelatedManyCPKSKTwos?:  {
    __typename: "ModelRelatedManyCPKSKTwoConnection",
    items:  Array< {
      __typename: "RelatedManyCPKSKTwo",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListRelatedOneCPKSKFoursQueryVariables = {
  filter?: ModelRelatedOneCPKSKFourFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListRelatedOneCPKSKFoursQuery = {
  listRelatedOneCPKSKFours?:  {
    __typename: "ModelRelatedOneCPKSKFourConnection",
    items:  Array< {
      __typename: "RelatedOneCPKSKFour",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkFour?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListRelatedOneCPKSKOnesQueryVariables = {
  filter?: ModelRelatedOneCPKSKOneFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListRelatedOneCPKSKOnesQuery = {
  listRelatedOneCPKSKOnes?:  {
    __typename: "ModelRelatedOneCPKSKOneConnection",
    items:  Array< {
      __typename: "RelatedOneCPKSKOne",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListRelatedOneCPKSKThreesQueryVariables = {
  filter?: ModelRelatedOneCPKSKThreeFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListRelatedOneCPKSKThreesQuery = {
  listRelatedOneCPKSKThrees?:  {
    __typename: "ModelRelatedOneCPKSKThreeConnection",
    items:  Array< {
      __typename: "RelatedOneCPKSKThree",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type ListRelatedOneCPKSKTwosQueryVariables = {
  filter?: ModelRelatedOneCPKSKTwoFilterInput | null,
  id?: string | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListRelatedOneCPKSKTwosQuery = {
  listRelatedOneCPKSKTwos?:  {
    __typename: "ModelRelatedOneCPKSKTwoConnection",
    items:  Array< {
      __typename: "RelatedOneCPKSKTwo",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type CreatePrimaryCPKSKFourMutationVariables = {
  condition?: ModelPrimaryCPKSKFourConditionInput | null,
  input: CreatePrimaryCPKSKFourInput,
};

export type CreatePrimaryCPKSKFourMutation = {
  createPrimaryCPKSKFour?:  {
    __typename: "PrimaryCPKSKFour",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKFourConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKFour",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkFour?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skFour: string,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type CreatePrimaryCPKSKOneMutationVariables = {
  condition?: ModelPrimaryCPKSKOneConditionInput | null,
  input: CreatePrimaryCPKSKOneInput,
};

export type CreatePrimaryCPKSKOneMutation = {
  createPrimaryCPKSKOne?:  {
    __typename: "PrimaryCPKSKOne",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKOneConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKOne",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    updatedAt: string,
  } | null,
};

export type CreatePrimaryCPKSKThreeMutationVariables = {
  condition?: ModelPrimaryCPKSKThreeConditionInput | null,
  input: CreatePrimaryCPKSKThreeInput,
};

export type CreatePrimaryCPKSKThreeMutation = {
  createPrimaryCPKSKThree?:  {
    __typename: "PrimaryCPKSKThree",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKThreeConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKThree",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type CreatePrimaryCPKSKTwoMutationVariables = {
  condition?: ModelPrimaryCPKSKTwoConditionInput | null,
  input: CreatePrimaryCPKSKTwoInput,
};

export type CreatePrimaryCPKSKTwoMutation = {
  createPrimaryCPKSKTwo?:  {
    __typename: "PrimaryCPKSKTwo",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKTwoConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKTwo",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type CreateRelatedManyCPKSKFourMutationVariables = {
  condition?: ModelRelatedManyCPKSKFourConditionInput | null,
  input: CreateRelatedManyCPKSKFourInput,
};

export type CreateRelatedManyCPKSKFourMutation = {
  createRelatedManyCPKSKFour?:  {
    __typename: "RelatedManyCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type CreateRelatedManyCPKSKOneMutationVariables = {
  condition?: ModelRelatedManyCPKSKOneConditionInput | null,
  input: CreateRelatedManyCPKSKOneInput,
};

export type CreateRelatedManyCPKSKOneMutation = {
  createRelatedManyCPKSKOne?:  {
    __typename: "RelatedManyCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type CreateRelatedManyCPKSKThreeMutationVariables = {
  condition?: ModelRelatedManyCPKSKThreeConditionInput | null,
  input: CreateRelatedManyCPKSKThreeInput,
};

export type CreateRelatedManyCPKSKThreeMutation = {
  createRelatedManyCPKSKThree?:  {
    __typename: "RelatedManyCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type CreateRelatedManyCPKSKTwoMutationVariables = {
  condition?: ModelRelatedManyCPKSKTwoConditionInput | null,
  input: CreateRelatedManyCPKSKTwoInput,
};

export type CreateRelatedManyCPKSKTwoMutation = {
  createRelatedManyCPKSKTwo?:  {
    __typename: "RelatedManyCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type CreateRelatedOneCPKSKFourMutationVariables = {
  condition?: ModelRelatedOneCPKSKFourConditionInput | null,
  input: CreateRelatedOneCPKSKFourInput,
};

export type CreateRelatedOneCPKSKFourMutation = {
  createRelatedOneCPKSKFour?:  {
    __typename: "RelatedOneCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type CreateRelatedOneCPKSKOneMutationVariables = {
  condition?: ModelRelatedOneCPKSKOneConditionInput | null,
  input: CreateRelatedOneCPKSKOneInput,
};

export type CreateRelatedOneCPKSKOneMutation = {
  createRelatedOneCPKSKOne?:  {
    __typename: "RelatedOneCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type CreateRelatedOneCPKSKThreeMutationVariables = {
  condition?: ModelRelatedOneCPKSKThreeConditionInput | null,
  input: CreateRelatedOneCPKSKThreeInput,
};

export type CreateRelatedOneCPKSKThreeMutation = {
  createRelatedOneCPKSKThree?:  {
    __typename: "RelatedOneCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type CreateRelatedOneCPKSKTwoMutationVariables = {
  condition?: ModelRelatedOneCPKSKTwoConditionInput | null,
  input: CreateRelatedOneCPKSKTwoInput,
};

export type CreateRelatedOneCPKSKTwoMutation = {
  createRelatedOneCPKSKTwo?:  {
    __typename: "RelatedOneCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type DeletePrimaryCPKSKFourMutationVariables = {
  condition?: ModelPrimaryCPKSKFourConditionInput | null,
  input: DeletePrimaryCPKSKFourInput,
};

export type DeletePrimaryCPKSKFourMutation = {
  deletePrimaryCPKSKFour?:  {
    __typename: "PrimaryCPKSKFour",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKFourConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKFour",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkFour?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skFour: string,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type DeletePrimaryCPKSKOneMutationVariables = {
  condition?: ModelPrimaryCPKSKOneConditionInput | null,
  input: DeletePrimaryCPKSKOneInput,
};

export type DeletePrimaryCPKSKOneMutation = {
  deletePrimaryCPKSKOne?:  {
    __typename: "PrimaryCPKSKOne",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKOneConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKOne",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    updatedAt: string,
  } | null,
};

export type DeletePrimaryCPKSKThreeMutationVariables = {
  condition?: ModelPrimaryCPKSKThreeConditionInput | null,
  input: DeletePrimaryCPKSKThreeInput,
};

export type DeletePrimaryCPKSKThreeMutation = {
  deletePrimaryCPKSKThree?:  {
    __typename: "PrimaryCPKSKThree",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKThreeConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKThree",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type DeletePrimaryCPKSKTwoMutationVariables = {
  condition?: ModelPrimaryCPKSKTwoConditionInput | null,
  input: DeletePrimaryCPKSKTwoInput,
};

export type DeletePrimaryCPKSKTwoMutation = {
  deletePrimaryCPKSKTwo?:  {
    __typename: "PrimaryCPKSKTwo",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKTwoConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKTwo",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type DeleteRelatedManyCPKSKFourMutationVariables = {
  condition?: ModelRelatedManyCPKSKFourConditionInput | null,
  input: DeleteRelatedManyCPKSKFourInput,
};

export type DeleteRelatedManyCPKSKFourMutation = {
  deleteRelatedManyCPKSKFour?:  {
    __typename: "RelatedManyCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteRelatedManyCPKSKOneMutationVariables = {
  condition?: ModelRelatedManyCPKSKOneConditionInput | null,
  input: DeleteRelatedManyCPKSKOneInput,
};

export type DeleteRelatedManyCPKSKOneMutation = {
  deleteRelatedManyCPKSKOne?:  {
    __typename: "RelatedManyCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteRelatedManyCPKSKThreeMutationVariables = {
  condition?: ModelRelatedManyCPKSKThreeConditionInput | null,
  input: DeleteRelatedManyCPKSKThreeInput,
};

export type DeleteRelatedManyCPKSKThreeMutation = {
  deleteRelatedManyCPKSKThree?:  {
    __typename: "RelatedManyCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteRelatedManyCPKSKTwoMutationVariables = {
  condition?: ModelRelatedManyCPKSKTwoConditionInput | null,
  input: DeleteRelatedManyCPKSKTwoInput,
};

export type DeleteRelatedManyCPKSKTwoMutation = {
  deleteRelatedManyCPKSKTwo?:  {
    __typename: "RelatedManyCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteRelatedOneCPKSKFourMutationVariables = {
  condition?: ModelRelatedOneCPKSKFourConditionInput | null,
  input: DeleteRelatedOneCPKSKFourInput,
};

export type DeleteRelatedOneCPKSKFourMutation = {
  deleteRelatedOneCPKSKFour?:  {
    __typename: "RelatedOneCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteRelatedOneCPKSKOneMutationVariables = {
  condition?: ModelRelatedOneCPKSKOneConditionInput | null,
  input: DeleteRelatedOneCPKSKOneInput,
};

export type DeleteRelatedOneCPKSKOneMutation = {
  deleteRelatedOneCPKSKOne?:  {
    __typename: "RelatedOneCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteRelatedOneCPKSKThreeMutationVariables = {
  condition?: ModelRelatedOneCPKSKThreeConditionInput | null,
  input: DeleteRelatedOneCPKSKThreeInput,
};

export type DeleteRelatedOneCPKSKThreeMutation = {
  deleteRelatedOneCPKSKThree?:  {
    __typename: "RelatedOneCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteRelatedOneCPKSKTwoMutationVariables = {
  condition?: ModelRelatedOneCPKSKTwoConditionInput | null,
  input: DeleteRelatedOneCPKSKTwoInput,
};

export type DeleteRelatedOneCPKSKTwoMutation = {
  deleteRelatedOneCPKSKTwo?:  {
    __typename: "RelatedOneCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdatePrimaryCPKSKFourMutationVariables = {
  condition?: ModelPrimaryCPKSKFourConditionInput | null,
  input: UpdatePrimaryCPKSKFourInput,
};

export type UpdatePrimaryCPKSKFourMutation = {
  updatePrimaryCPKSKFour?:  {
    __typename: "PrimaryCPKSKFour",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKFourConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKFour",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkFour?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skFour: string,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type UpdatePrimaryCPKSKOneMutationVariables = {
  condition?: ModelPrimaryCPKSKOneConditionInput | null,
  input: UpdatePrimaryCPKSKOneInput,
};

export type UpdatePrimaryCPKSKOneMutation = {
  updatePrimaryCPKSKOne?:  {
    __typename: "PrimaryCPKSKOne",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKOneConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKOne",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    updatedAt: string,
  } | null,
};

export type UpdatePrimaryCPKSKThreeMutationVariables = {
  condition?: ModelPrimaryCPKSKThreeConditionInput | null,
  input: UpdatePrimaryCPKSKThreeInput,
};

export type UpdatePrimaryCPKSKThreeMutation = {
  updatePrimaryCPKSKThree?:  {
    __typename: "PrimaryCPKSKThree",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKThreeConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKThree",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type UpdatePrimaryCPKSKTwoMutationVariables = {
  condition?: ModelPrimaryCPKSKTwoConditionInput | null,
  input: UpdatePrimaryCPKSKTwoInput,
};

export type UpdatePrimaryCPKSKTwoMutation = {
  updatePrimaryCPKSKTwo?:  {
    __typename: "PrimaryCPKSKTwo",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKTwoConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKTwo",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type UpdateRelatedManyCPKSKFourMutationVariables = {
  condition?: ModelRelatedManyCPKSKFourConditionInput | null,
  input: UpdateRelatedManyCPKSKFourInput,
};

export type UpdateRelatedManyCPKSKFourMutation = {
  updateRelatedManyCPKSKFour?:  {
    __typename: "RelatedManyCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateRelatedManyCPKSKOneMutationVariables = {
  condition?: ModelRelatedManyCPKSKOneConditionInput | null,
  input: UpdateRelatedManyCPKSKOneInput,
};

export type UpdateRelatedManyCPKSKOneMutation = {
  updateRelatedManyCPKSKOne?:  {
    __typename: "RelatedManyCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateRelatedManyCPKSKThreeMutationVariables = {
  condition?: ModelRelatedManyCPKSKThreeConditionInput | null,
  input: UpdateRelatedManyCPKSKThreeInput,
};

export type UpdateRelatedManyCPKSKThreeMutation = {
  updateRelatedManyCPKSKThree?:  {
    __typename: "RelatedManyCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateRelatedManyCPKSKTwoMutationVariables = {
  condition?: ModelRelatedManyCPKSKTwoConditionInput | null,
  input: UpdateRelatedManyCPKSKTwoInput,
};

export type UpdateRelatedManyCPKSKTwoMutation = {
  updateRelatedManyCPKSKTwo?:  {
    __typename: "RelatedManyCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateRelatedOneCPKSKFourMutationVariables = {
  condition?: ModelRelatedOneCPKSKFourConditionInput | null,
  input: UpdateRelatedOneCPKSKFourInput,
};

export type UpdateRelatedOneCPKSKFourMutation = {
  updateRelatedOneCPKSKFour?:  {
    __typename: "RelatedOneCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateRelatedOneCPKSKOneMutationVariables = {
  condition?: ModelRelatedOneCPKSKOneConditionInput | null,
  input: UpdateRelatedOneCPKSKOneInput,
};

export type UpdateRelatedOneCPKSKOneMutation = {
  updateRelatedOneCPKSKOne?:  {
    __typename: "RelatedOneCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateRelatedOneCPKSKThreeMutationVariables = {
  condition?: ModelRelatedOneCPKSKThreeConditionInput | null,
  input: UpdateRelatedOneCPKSKThreeInput,
};

export type UpdateRelatedOneCPKSKThreeMutation = {
  updateRelatedOneCPKSKThree?:  {
    __typename: "RelatedOneCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateRelatedOneCPKSKTwoMutationVariables = {
  condition?: ModelRelatedOneCPKSKTwoConditionInput | null,
  input: UpdateRelatedOneCPKSKTwoInput,
};

export type UpdateRelatedOneCPKSKTwoMutation = {
  updateRelatedOneCPKSKTwo?:  {
    __typename: "RelatedOneCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreatePrimaryCPKSKFourSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKFourFilterInput | null,
};

export type OnCreatePrimaryCPKSKFourSubscription = {
  onCreatePrimaryCPKSKFour?:  {
    __typename: "PrimaryCPKSKFour",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKFourConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKFour",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkFour?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skFour: string,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type OnCreatePrimaryCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKOneFilterInput | null,
};

export type OnCreatePrimaryCPKSKOneSubscription = {
  onCreatePrimaryCPKSKOne?:  {
    __typename: "PrimaryCPKSKOne",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKOneConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKOne",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    updatedAt: string,
  } | null,
};

export type OnCreatePrimaryCPKSKThreeSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKThreeFilterInput | null,
};

export type OnCreatePrimaryCPKSKThreeSubscription = {
  onCreatePrimaryCPKSKThree?:  {
    __typename: "PrimaryCPKSKThree",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKThreeConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKThree",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type OnCreatePrimaryCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKTwoFilterInput | null,
};

export type OnCreatePrimaryCPKSKTwoSubscription = {
  onCreatePrimaryCPKSKTwo?:  {
    __typename: "PrimaryCPKSKTwo",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKTwoConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKTwo",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type OnCreateRelatedManyCPKSKFourSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKFourFilterInput | null,
};

export type OnCreateRelatedManyCPKSKFourSubscription = {
  onCreateRelatedManyCPKSKFour?:  {
    __typename: "RelatedManyCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateRelatedManyCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKOneFilterInput | null,
};

export type OnCreateRelatedManyCPKSKOneSubscription = {
  onCreateRelatedManyCPKSKOne?:  {
    __typename: "RelatedManyCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateRelatedManyCPKSKThreeSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKThreeFilterInput | null,
};

export type OnCreateRelatedManyCPKSKThreeSubscription = {
  onCreateRelatedManyCPKSKThree?:  {
    __typename: "RelatedManyCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateRelatedManyCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKTwoFilterInput | null,
};

export type OnCreateRelatedManyCPKSKTwoSubscription = {
  onCreateRelatedManyCPKSKTwo?:  {
    __typename: "RelatedManyCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateRelatedOneCPKSKFourSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKFourFilterInput | null,
};

export type OnCreateRelatedOneCPKSKFourSubscription = {
  onCreateRelatedOneCPKSKFour?:  {
    __typename: "RelatedOneCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateRelatedOneCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKOneFilterInput | null,
};

export type OnCreateRelatedOneCPKSKOneSubscription = {
  onCreateRelatedOneCPKSKOne?:  {
    __typename: "RelatedOneCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateRelatedOneCPKSKThreeSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKThreeFilterInput | null,
};

export type OnCreateRelatedOneCPKSKThreeSubscription = {
  onCreateRelatedOneCPKSKThree?:  {
    __typename: "RelatedOneCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateRelatedOneCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKTwoFilterInput | null,
};

export type OnCreateRelatedOneCPKSKTwoSubscription = {
  onCreateRelatedOneCPKSKTwo?:  {
    __typename: "RelatedOneCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeletePrimaryCPKSKFourSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKFourFilterInput | null,
};

export type OnDeletePrimaryCPKSKFourSubscription = {
  onDeletePrimaryCPKSKFour?:  {
    __typename: "PrimaryCPKSKFour",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKFourConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKFour",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkFour?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skFour: string,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type OnDeletePrimaryCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKOneFilterInput | null,
};

export type OnDeletePrimaryCPKSKOneSubscription = {
  onDeletePrimaryCPKSKOne?:  {
    __typename: "PrimaryCPKSKOne",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKOneConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKOne",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    updatedAt: string,
  } | null,
};

export type OnDeletePrimaryCPKSKThreeSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKThreeFilterInput | null,
};

export type OnDeletePrimaryCPKSKThreeSubscription = {
  onDeletePrimaryCPKSKThree?:  {
    __typename: "PrimaryCPKSKThree",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKThreeConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKThree",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type OnDeletePrimaryCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKTwoFilterInput | null,
};

export type OnDeletePrimaryCPKSKTwoSubscription = {
  onDeletePrimaryCPKSKTwo?:  {
    __typename: "PrimaryCPKSKTwo",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKTwoConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKTwo",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteRelatedManyCPKSKFourSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKFourFilterInput | null,
};

export type OnDeleteRelatedManyCPKSKFourSubscription = {
  onDeleteRelatedManyCPKSKFour?:  {
    __typename: "RelatedManyCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteRelatedManyCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKOneFilterInput | null,
};

export type OnDeleteRelatedManyCPKSKOneSubscription = {
  onDeleteRelatedManyCPKSKOne?:  {
    __typename: "RelatedManyCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteRelatedManyCPKSKThreeSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKThreeFilterInput | null,
};

export type OnDeleteRelatedManyCPKSKThreeSubscription = {
  onDeleteRelatedManyCPKSKThree?:  {
    __typename: "RelatedManyCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteRelatedManyCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKTwoFilterInput | null,
};

export type OnDeleteRelatedManyCPKSKTwoSubscription = {
  onDeleteRelatedManyCPKSKTwo?:  {
    __typename: "RelatedManyCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteRelatedOneCPKSKFourSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKFourFilterInput | null,
};

export type OnDeleteRelatedOneCPKSKFourSubscription = {
  onDeleteRelatedOneCPKSKFour?:  {
    __typename: "RelatedOneCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteRelatedOneCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKOneFilterInput | null,
};

export type OnDeleteRelatedOneCPKSKOneSubscription = {
  onDeleteRelatedOneCPKSKOne?:  {
    __typename: "RelatedOneCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteRelatedOneCPKSKThreeSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKThreeFilterInput | null,
};

export type OnDeleteRelatedOneCPKSKThreeSubscription = {
  onDeleteRelatedOneCPKSKThree?:  {
    __typename: "RelatedOneCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteRelatedOneCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKTwoFilterInput | null,
};

export type OnDeleteRelatedOneCPKSKTwoSubscription = {
  onDeleteRelatedOneCPKSKTwo?:  {
    __typename: "RelatedOneCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdatePrimaryCPKSKFourSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKFourFilterInput | null,
};

export type OnUpdatePrimaryCPKSKFourSubscription = {
  onUpdatePrimaryCPKSKFour?:  {
    __typename: "PrimaryCPKSKFour",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKFourConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKFour",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkFour?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skFour: string,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type OnUpdatePrimaryCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKOneFilterInput | null,
};

export type OnUpdatePrimaryCPKSKOneSubscription = {
  onUpdatePrimaryCPKSKOne?:  {
    __typename: "PrimaryCPKSKOne",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKOneConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKOne",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    updatedAt: string,
  } | null,
};

export type OnUpdatePrimaryCPKSKThreeSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKThreeFilterInput | null,
};

export type OnUpdatePrimaryCPKSKThreeSubscription = {
  onUpdatePrimaryCPKSKThree?:  {
    __typename: "PrimaryCPKSKThree",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKThreeConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKThree",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkThree?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skThree: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type OnUpdatePrimaryCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryCPKSKTwoFilterInput | null,
};

export type OnUpdatePrimaryCPKSKTwoSubscription = {
  onUpdatePrimaryCPKSKTwo?:  {
    __typename: "PrimaryCPKSKTwo",
    createdAt: string,
    id: string,
    relatedMany?:  {
      __typename: "ModelRelatedManyCPKSKTwoConnection",
      nextToken?: string | null,
    } | null,
    relatedOne?:  {
      __typename: "RelatedOneCPKSKTwo",
      createdAt: string,
      id: string,
      primaryId?: string | null,
      primarySkOne?: string | null,
      primarySkTwo?: string | null,
      updatedAt: string,
    } | null,
    skOne: string,
    skTwo: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateRelatedManyCPKSKFourSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKFourFilterInput | null,
};

export type OnUpdateRelatedManyCPKSKFourSubscription = {
  onUpdateRelatedManyCPKSKFour?:  {
    __typename: "RelatedManyCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateRelatedManyCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKOneFilterInput | null,
};

export type OnUpdateRelatedManyCPKSKOneSubscription = {
  onUpdateRelatedManyCPKSKOne?:  {
    __typename: "RelatedManyCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateRelatedManyCPKSKThreeSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKThreeFilterInput | null,
};

export type OnUpdateRelatedManyCPKSKThreeSubscription = {
  onUpdateRelatedManyCPKSKThree?:  {
    __typename: "RelatedManyCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateRelatedManyCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyCPKSKTwoFilterInput | null,
};

export type OnUpdateRelatedManyCPKSKTwoSubscription = {
  onUpdateRelatedManyCPKSKTwo?:  {
    __typename: "RelatedManyCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateRelatedOneCPKSKFourSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKFourFilterInput | null,
};

export type OnUpdateRelatedOneCPKSKFourSubscription = {
  onUpdateRelatedOneCPKSKFour?:  {
    __typename: "RelatedOneCPKSKFour",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKFour",
      createdAt: string,
      id: string,
      skFour: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkFour?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateRelatedOneCPKSKOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKOneFilterInput | null,
};

export type OnUpdateRelatedOneCPKSKOneSubscription = {
  onUpdateRelatedOneCPKSKOne?:  {
    __typename: "RelatedOneCPKSKOne",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKOne",
      createdAt: string,
      id: string,
      skOne: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateRelatedOneCPKSKThreeSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKThreeFilterInput | null,
};

export type OnUpdateRelatedOneCPKSKThreeSubscription = {
  onUpdateRelatedOneCPKSKThree?:  {
    __typename: "RelatedOneCPKSKThree",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKThree",
      createdAt: string,
      id: string,
      skOne: string,
      skThree: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkThree?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateRelatedOneCPKSKTwoSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneCPKSKTwoFilterInput | null,
};

export type OnUpdateRelatedOneCPKSKTwoSubscription = {
  onUpdateRelatedOneCPKSKTwo?:  {
    __typename: "RelatedOneCPKSKTwo",
    createdAt: string,
    id: string,
    primary?:  {
      __typename: "PrimaryCPKSKTwo",
      createdAt: string,
      id: string,
      skOne: string,
      skTwo: string,
      updatedAt: string,
    } | null,
    primaryId?: string | null,
    primarySkOne?: string | null,
    primarySkTwo?: string | null,
    updatedAt: string,
  } | null,
};
