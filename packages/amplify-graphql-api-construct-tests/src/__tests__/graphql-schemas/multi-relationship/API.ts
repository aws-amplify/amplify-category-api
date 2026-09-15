/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreatePrimaryInput = {
  id?: string | null;
  content?: string | null;
};

export type ModelPrimaryConditionInput = {
  content?: ModelStringInput | null;
  and?: Array<ModelPrimaryConditionInput | null> | null;
  or?: Array<ModelPrimaryConditionInput | null> | null;
  not?: ModelPrimaryConditionInput | null;
};

export type ModelStringInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  size?: ModelSizeInput | null;
};

export enum ModelAttributeTypes {
  binary = 'binary',
  binarySet = 'binarySet',
  bool = 'bool',
  list = 'list',
  map = 'map',
  number = 'number',
  numberSet = 'numberSet',
  string = 'string',
  stringSet = 'stringSet',
  _null = '_null',
}

export type ModelSizeInput = {
  ne?: number | null;
  eq?: number | null;
  le?: number | null;
  lt?: number | null;
  ge?: number | null;
  gt?: number | null;
  between?: Array<number | null> | null;
};

export type Primary = {
  __typename: 'Primary';
  id: string;
  content?: string | null;
  relatedMany1?: ModelRelatedManyConnection | null;
  relatedMany2?: ModelRelatedManyConnection | null;
  relatedOne1?: RelatedOne | null;
  relatedOne2?: RelatedOne | null;
};

export type ModelRelatedManyConnection = {
  __typename: 'ModelRelatedManyConnection';
  items: Array<RelatedMany | null>;
  nextToken?: string | null;
};

export type RelatedMany = {
  __typename: 'RelatedMany';
  id: string;
  content?: string | null;
  primaryId1?: string | null;
  primary1?: Primary | null;
  primaryId2?: string | null;
  primary2?: Primary | null;
};

export type RelatedOne = {
  __typename: 'RelatedOne';
  id: string;
  content?: string | null;
  primaryId1?: string | null;
  primary1?: Primary | null;
  primaryId2?: string | null;
  primary2?: Primary | null;
};

export type UpdatePrimaryInput = {
  id: string;
  content?: string | null;
};

export type DeletePrimaryInput = {
  id: string;
};

export type CreateRelatedManyInput = {
  id?: string | null;
  content?: string | null;
  primaryId1?: string | null;
  primaryId2?: string | null;
};

export type ModelRelatedManyConditionInput = {
  content?: ModelStringInput | null;
  primaryId1?: ModelStringInput | null;
  primaryId2?: ModelStringInput | null;
  and?: Array<ModelRelatedManyConditionInput | null> | null;
  or?: Array<ModelRelatedManyConditionInput | null> | null;
  not?: ModelRelatedManyConditionInput | null;
};

export type UpdateRelatedManyInput = {
  id: string;
  content?: string | null;
  primaryId1?: string | null;
  primaryId2?: string | null;
};

export type DeleteRelatedManyInput = {
  id: string;
};

export type CreateRelatedOneInput = {
  id?: string | null;
  content?: string | null;
  primaryId1?: string | null;
  primaryId2?: string | null;
};

export type ModelRelatedOneConditionInput = {
  content?: ModelStringInput | null;
  primaryId1?: ModelStringInput | null;
  primaryId2?: ModelStringInput | null;
  and?: Array<ModelRelatedOneConditionInput | null> | null;
  or?: Array<ModelRelatedOneConditionInput | null> | null;
  not?: ModelRelatedOneConditionInput | null;
};

export type UpdateRelatedOneInput = {
  id: string;
  content?: string | null;
  primaryId1?: string | null;
  primaryId2?: string | null;
};

export type DeleteRelatedOneInput = {
  id: string;
};

export type ModelPrimaryFilterInput = {
  id?: ModelIDInput | null;
  content?: ModelStringInput | null;
  and?: Array<ModelPrimaryFilterInput | null> | null;
  or?: Array<ModelPrimaryFilterInput | null> | null;
  not?: ModelPrimaryFilterInput | null;
};

export type ModelIDInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  attributeExists?: boolean | null;
  attributeType?: ModelAttributeTypes | null;
  size?: ModelSizeInput | null;
};

export enum ModelSortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type ModelPrimaryConnection = {
  __typename: 'ModelPrimaryConnection';
  items: Array<Primary | null>;
  nextToken?: string | null;
};

export type ModelRelatedManyFilterInput = {
  id?: ModelIDInput | null;
  content?: ModelStringInput | null;
  primaryId1?: ModelStringInput | null;
  primaryId2?: ModelStringInput | null;
  and?: Array<ModelRelatedManyFilterInput | null> | null;
  or?: Array<ModelRelatedManyFilterInput | null> | null;
  not?: ModelRelatedManyFilterInput | null;
};

export type ModelRelatedOneFilterInput = {
  id?: ModelIDInput | null;
  content?: ModelStringInput | null;
  primaryId1?: ModelStringInput | null;
  primaryId2?: ModelStringInput | null;
  and?: Array<ModelRelatedOneFilterInput | null> | null;
  or?: Array<ModelRelatedOneFilterInput | null> | null;
  not?: ModelRelatedOneFilterInput | null;
};

export type ModelRelatedOneConnection = {
  __typename: 'ModelRelatedOneConnection';
  items: Array<RelatedOne | null>;
  nextToken?: string | null;
};

export type ModelSubscriptionPrimaryFilterInput = {
  id?: ModelSubscriptionIDInput | null;
  content?: ModelSubscriptionStringInput | null;
  and?: Array<ModelSubscriptionPrimaryFilterInput | null> | null;
  or?: Array<ModelSubscriptionPrimaryFilterInput | null> | null;
};

export type ModelSubscriptionIDInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  in?: Array<string | null> | null;
  notIn?: Array<string | null> | null;
};

export type ModelSubscriptionStringInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  in?: Array<string | null> | null;
  notIn?: Array<string | null> | null;
};

export type ModelSubscriptionRelatedManyFilterInput = {
  id?: ModelSubscriptionIDInput | null;
  content?: ModelSubscriptionStringInput | null;
  primaryId1?: ModelSubscriptionStringInput | null;
  primaryId2?: ModelSubscriptionStringInput | null;
  and?: Array<ModelSubscriptionRelatedManyFilterInput | null> | null;
  or?: Array<ModelSubscriptionRelatedManyFilterInput | null> | null;
};

export type ModelSubscriptionRelatedOneFilterInput = {
  id?: ModelSubscriptionIDInput | null;
  content?: ModelSubscriptionStringInput | null;
  primaryId1?: ModelSubscriptionStringInput | null;
  primaryId2?: ModelSubscriptionStringInput | null;
  and?: Array<ModelSubscriptionRelatedOneFilterInput | null> | null;
  or?: Array<ModelSubscriptionRelatedOneFilterInput | null> | null;
};

export type CreatePrimaryMutationVariables = {
  input: CreatePrimaryInput;
  condition?: ModelPrimaryConditionInput | null;
};

export type CreatePrimaryMutation = {
  createPrimary?: {
    __typename: 'Primary';
    id: string;
    content?: string | null;
    relatedMany1?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedMany2?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedOne1?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
    relatedOne2?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type UpdatePrimaryMutationVariables = {
  input: UpdatePrimaryInput;
  condition?: ModelPrimaryConditionInput | null;
};

export type UpdatePrimaryMutation = {
  updatePrimary?: {
    __typename: 'Primary';
    id: string;
    content?: string | null;
    relatedMany1?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedMany2?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedOne1?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
    relatedOne2?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type DeletePrimaryMutationVariables = {
  input: DeletePrimaryInput;
  condition?: ModelPrimaryConditionInput | null;
};

export type DeletePrimaryMutation = {
  deletePrimary?: {
    __typename: 'Primary';
    id: string;
    content?: string | null;
    relatedMany1?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedMany2?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedOne1?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
    relatedOne2?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type CreateRelatedManyMutationVariables = {
  input: CreateRelatedManyInput;
  condition?: ModelRelatedManyConditionInput | null;
};

export type CreateRelatedManyMutation = {
  createRelatedMany?: {
    __typename: 'RelatedMany';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type UpdateRelatedManyMutationVariables = {
  input: UpdateRelatedManyInput;
  condition?: ModelRelatedManyConditionInput | null;
};

export type UpdateRelatedManyMutation = {
  updateRelatedMany?: {
    __typename: 'RelatedMany';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type DeleteRelatedManyMutationVariables = {
  input: DeleteRelatedManyInput;
  condition?: ModelRelatedManyConditionInput | null;
};

export type DeleteRelatedManyMutation = {
  deleteRelatedMany?: {
    __typename: 'RelatedMany';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type CreateRelatedOneMutationVariables = {
  input: CreateRelatedOneInput;
  condition?: ModelRelatedOneConditionInput | null;
};

export type CreateRelatedOneMutation = {
  createRelatedOne?: {
    __typename: 'RelatedOne';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type UpdateRelatedOneMutationVariables = {
  input: UpdateRelatedOneInput;
  condition?: ModelRelatedOneConditionInput | null;
};

export type UpdateRelatedOneMutation = {
  updateRelatedOne?: {
    __typename: 'RelatedOne';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type DeleteRelatedOneMutationVariables = {
  input: DeleteRelatedOneInput;
  condition?: ModelRelatedOneConditionInput | null;
};

export type DeleteRelatedOneMutation = {
  deleteRelatedOne?: {
    __typename: 'RelatedOne';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type GetPrimaryQueryVariables = {
  id: string;
};

export type GetPrimaryQuery = {
  getPrimary?: {
    __typename: 'Primary';
    id: string;
    content?: string | null;
    relatedMany1?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedMany2?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedOne1?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
    relatedOne2?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type ListPrimariesQueryVariables = {
  id?: string | null;
  filter?: ModelPrimaryFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListPrimariesQuery = {
  listPrimaries?: {
    __typename: 'ModelPrimaryConnection';
    items: Array<{
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type GetRelatedManyQueryVariables = {
  id: string;
};

export type GetRelatedManyQuery = {
  getRelatedMany?: {
    __typename: 'RelatedMany';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type ListRelatedManiesQueryVariables = {
  id?: string | null;
  filter?: ModelRelatedManyFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListRelatedManiesQuery = {
  listRelatedManies?: {
    __typename: 'ModelRelatedManyConnection';
    items: Array<{
      __typename: 'RelatedMany';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type GetRelatedOneQueryVariables = {
  id: string;
};

export type GetRelatedOneQuery = {
  getRelatedOne?: {
    __typename: 'RelatedOne';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type ListRelatedOnesQueryVariables = {
  id?: string | null;
  filter?: ModelRelatedOneFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
  sortDirection?: ModelSortDirection | null;
};

export type ListRelatedOnesQuery = {
  listRelatedOnes?: {
    __typename: 'ModelRelatedOneConnection';
    items: Array<{
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type OnCreatePrimarySubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryFilterInput | null;
};

export type OnCreatePrimarySubscription = {
  onCreatePrimary?: {
    __typename: 'Primary';
    id: string;
    content?: string | null;
    relatedMany1?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedMany2?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedOne1?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
    relatedOne2?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type OnUpdatePrimarySubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryFilterInput | null;
};

export type OnUpdatePrimarySubscription = {
  onUpdatePrimary?: {
    __typename: 'Primary';
    id: string;
    content?: string | null;
    relatedMany1?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedMany2?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedOne1?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
    relatedOne2?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type OnDeletePrimarySubscriptionVariables = {
  filter?: ModelSubscriptionPrimaryFilterInput | null;
};

export type OnDeletePrimarySubscription = {
  onDeletePrimary?: {
    __typename: 'Primary';
    id: string;
    content?: string | null;
    relatedMany1?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedMany2?: {
      __typename: 'ModelRelatedManyConnection';
      items: Array<{
        __typename: 'RelatedMany';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null>;
      nextToken?: string | null;
    } | null;
    relatedOne1?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
    relatedOne2?: {
      __typename: 'RelatedOne';
      id: string;
      content?: string | null;
      primaryId1?: string | null;
      primary1?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
      primaryId2?: string | null;
      primary2?: {
        __typename: 'Primary';
        id: string;
        content?: string | null;
        relatedMany1?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedMany2?: {
          __typename: 'ModelRelatedManyConnection';
          nextToken?: string | null;
        } | null;
        relatedOne1?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
        relatedOne2?: {
          __typename: 'RelatedOne';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type OnCreateRelatedManySubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyFilterInput | null;
};

export type OnCreateRelatedManySubscription = {
  onCreateRelatedMany?: {
    __typename: 'RelatedMany';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type OnUpdateRelatedManySubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyFilterInput | null;
};

export type OnUpdateRelatedManySubscription = {
  onUpdateRelatedMany?: {
    __typename: 'RelatedMany';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type OnDeleteRelatedManySubscriptionVariables = {
  filter?: ModelSubscriptionRelatedManyFilterInput | null;
};

export type OnDeleteRelatedManySubscription = {
  onDeleteRelatedMany?: {
    __typename: 'RelatedMany';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type OnCreateRelatedOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneFilterInput | null;
};

export type OnCreateRelatedOneSubscription = {
  onCreateRelatedOne?: {
    __typename: 'RelatedOne';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type OnUpdateRelatedOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneFilterInput | null;
};

export type OnUpdateRelatedOneSubscription = {
  onUpdateRelatedOne?: {
    __typename: 'RelatedOne';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type OnDeleteRelatedOneSubscriptionVariables = {
  filter?: ModelSubscriptionRelatedOneFilterInput | null;
};

export type OnDeleteRelatedOneSubscription = {
  onDeleteRelatedOne?: {
    __typename: 'RelatedOne';
    id: string;
    content?: string | null;
    primaryId1?: string | null;
    primary1?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
    primaryId2?: string | null;
    primary2?: {
      __typename: 'Primary';
      id: string;
      content?: string | null;
      relatedMany1?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedMany2?: {
        __typename: 'ModelRelatedManyConnection';
        items: Array<{
          __typename: 'RelatedMany';
          id: string;
          content?: string | null;
          primaryId1?: string | null;
          primaryId2?: string | null;
        } | null>;
        nextToken?: string | null;
      } | null;
      relatedOne1?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
      relatedOne2?: {
        __typename: 'RelatedOne';
        id: string;
        content?: string | null;
        primaryId1?: string | null;
        primary1?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
        primaryId2?: string | null;
        primary2?: {
          __typename: 'Primary';
          id: string;
          content?: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};
