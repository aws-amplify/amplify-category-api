/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreateTreeNodeInput = {
  value?: string | null;
  parentId?: string | null;
  id?: string | null;
};

export type ModelTreeNodeConditionInput = {
  value?: ModelStringInput | null;
  parentId?: ModelIDInput | null;
  and?: Array<ModelTreeNodeConditionInput | null> | null;
  or?: Array<ModelTreeNodeConditionInput | null> | null;
  not?: ModelTreeNodeConditionInput | null;
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

export type TreeNode = {
  __typename: 'TreeNode';
  value?: string | null;
  parentId?: string | null;
  parent?: TreeNode | null;
  children?: ModelTreeNodeConnection | null;
  id: string;
};

export type ModelTreeNodeConnection = {
  __typename: 'ModelTreeNodeConnection';
  items: Array<TreeNode | null>;
  nextToken?: string | null;
};

export type UpdateTreeNodeInput = {
  value?: string | null;
  parentId?: string | null;
  id: string;
};

export type DeleteTreeNodeInput = {
  id: string;
};

export type ModelTreeNodeFilterInput = {
  value?: ModelStringInput | null;
  parentId?: ModelIDInput | null;
  id?: ModelIDInput | null;
  and?: Array<ModelTreeNodeFilterInput | null> | null;
  or?: Array<ModelTreeNodeFilterInput | null> | null;
  not?: ModelTreeNodeFilterInput | null;
};

export type ModelSubscriptionTreeNodeFilterInput = {
  value?: ModelSubscriptionStringInput | null;
  parentId?: ModelSubscriptionIDInput | null;
  id?: ModelSubscriptionIDInput | null;
  and?: Array<ModelSubscriptionTreeNodeFilterInput | null> | null;
  or?: Array<ModelSubscriptionTreeNodeFilterInput | null> | null;
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

export type CreateTreeNodeMutationVariables = {
  input: CreateTreeNodeInput;
  condition?: ModelTreeNodeConditionInput | null;
};

export type CreateTreeNodeMutation = {
  createTreeNode?: {
    __typename: 'TreeNode';
    value?: string | null;
    parentId?: string | null;
    parent?: {
      __typename: 'TreeNode';
      value?: string | null;
      parentId?: string | null;
      parent?: {
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null;
      children?: {
        __typename: 'ModelTreeNodeConnection';
        items: Array<{
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      id: string;
    } | null;
    children?: {
      __typename: 'ModelTreeNodeConnection';
      items: Array<{
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    id: string;
  } | null;
};

export type UpdateTreeNodeMutationVariables = {
  input: UpdateTreeNodeInput;
  condition?: ModelTreeNodeConditionInput | null;
};

export type UpdateTreeNodeMutation = {
  updateTreeNode?: {
    __typename: 'TreeNode';
    value?: string | null;
    parentId?: string | null;
    parent?: {
      __typename: 'TreeNode';
      value?: string | null;
      parentId?: string | null;
      parent?: {
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null;
      children?: {
        __typename: 'ModelTreeNodeConnection';
        items: Array<{
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      id: string;
    } | null;
    children?: {
      __typename: 'ModelTreeNodeConnection';
      items: Array<{
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    id: string;
  } | null;
};

export type DeleteTreeNodeMutationVariables = {
  input: DeleteTreeNodeInput;
  condition?: ModelTreeNodeConditionInput | null;
};

export type DeleteTreeNodeMutation = {
  deleteTreeNode?: {
    __typename: 'TreeNode';
    value?: string | null;
    parentId?: string | null;
    parent?: {
      __typename: 'TreeNode';
      value?: string | null;
      parentId?: string | null;
      parent?: {
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null;
      children?: {
        __typename: 'ModelTreeNodeConnection';
        items: Array<{
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      id: string;
    } | null;
    children?: {
      __typename: 'ModelTreeNodeConnection';
      items: Array<{
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    id: string;
  } | null;
};

export type GetTreeNodeQueryVariables = {
  id: string;
};

export type GetTreeNodeQuery = {
  getTreeNode?: {
    __typename: 'TreeNode';
    value?: string | null;
    parentId?: string | null;
    parent?: {
      __typename: 'TreeNode';
      value?: string | null;
      parentId?: string | null;
      parent?: {
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null;
      children?: {
        __typename: 'ModelTreeNodeConnection';
        items: Array<{
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      id: string;
    } | null;
    children?: {
      __typename: 'ModelTreeNodeConnection';
      items: Array<{
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    id: string;
  } | null;
};

export type ListTreeNodesQueryVariables = {
  filter?: ModelTreeNodeFilterInput | null;
  limit?: number | null;
  nextToken?: string | null;
};

export type ListTreeNodesQuery = {
  listTreeNodes?: {
    __typename: 'ModelTreeNodeConnection';
    items: Array<{
      __typename: 'TreeNode';
      value?: string | null;
      parentId?: string | null;
      parent?: {
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null;
      children?: {
        __typename: 'ModelTreeNodeConnection';
        items: Array<{
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      id: string;
    } | null>;
    nextToken?: string | null;
  } | null;
};

export type OnCreateTreeNodeSubscriptionVariables = {
  filter?: ModelSubscriptionTreeNodeFilterInput | null;
};

export type OnCreateTreeNodeSubscription = {
  onCreateTreeNode?: {
    __typename: 'TreeNode';
    value?: string | null;
    parentId?: string | null;
    parent?: {
      __typename: 'TreeNode';
      value?: string | null;
      parentId?: string | null;
      parent?: {
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null;
      children?: {
        __typename: 'ModelTreeNodeConnection';
        items: Array<{
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      id: string;
    } | null;
    children?: {
      __typename: 'ModelTreeNodeConnection';
      items: Array<{
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    id: string;
  } | null;
};

export type OnUpdateTreeNodeSubscriptionVariables = {
  filter?: ModelSubscriptionTreeNodeFilterInput | null;
};

export type OnUpdateTreeNodeSubscription = {
  onUpdateTreeNode?: {
    __typename: 'TreeNode';
    value?: string | null;
    parentId?: string | null;
    parent?: {
      __typename: 'TreeNode';
      value?: string | null;
      parentId?: string | null;
      parent?: {
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null;
      children?: {
        __typename: 'ModelTreeNodeConnection';
        items: Array<{
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      id: string;
    } | null;
    children?: {
      __typename: 'ModelTreeNodeConnection';
      items: Array<{
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    id: string;
  } | null;
};

export type OnDeleteTreeNodeSubscriptionVariables = {
  filter?: ModelSubscriptionTreeNodeFilterInput | null;
};

export type OnDeleteTreeNodeSubscription = {
  onDeleteTreeNode?: {
    __typename: 'TreeNode';
    value?: string | null;
    parentId?: string | null;
    parent?: {
      __typename: 'TreeNode';
      value?: string | null;
      parentId?: string | null;
      parent?: {
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null;
      children?: {
        __typename: 'ModelTreeNodeConnection';
        items: Array<{
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null>;
        nextToken?: string | null;
      } | null;
      id: string;
    } | null;
    children?: {
      __typename: 'ModelTreeNodeConnection';
      items: Array<{
        __typename: 'TreeNode';
        value?: string | null;
        parentId?: string | null;
        parent?: {
          __typename: 'TreeNode';
          value?: string | null;
          parentId?: string | null;
          id: string;
        } | null;
        children?: {
          __typename: 'ModelTreeNodeConnection';
          nextToken?: string | null;
        } | null;
        id: string;
      } | null>;
      nextToken?: string | null;
    } | null;
    id: string;
  } | null;
};
