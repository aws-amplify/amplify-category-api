/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from './API';
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createTreeNode = /* GraphQL */ `mutation CreateTreeNode(
  $input: CreateTreeNodeInput!
  $condition: ModelTreeNodeConditionInput
) {
  createTreeNode(input: $input, condition: $condition) {
    value
    parentId
    parent {
      value
      parentId
      parent {
        value
        parentId
        parent {
          value
          parentId
          id
        }
        children {
          nextToken
        }
        id
      }
      children {
        items {
          value
          parentId
          id
        }
        nextToken
      }
      id
    }
    children {
      items {
        value
        parentId
        parent {
          value
          parentId
          id
        }
        children {
          nextToken
        }
        id
      }
      nextToken
    }
    id
  }
}
` as GeneratedMutation<APITypes.CreateTreeNodeMutationVariables, APITypes.CreateTreeNodeMutation>;
export const updateTreeNode = /* GraphQL */ `mutation UpdateTreeNode(
  $input: UpdateTreeNodeInput!
  $condition: ModelTreeNodeConditionInput
) {
  updateTreeNode(input: $input, condition: $condition) {
    value
    parentId
    parent {
      value
      parentId
      parent {
        value
        parentId
        parent {
          value
          parentId
          id
        }
        children {
          nextToken
        }
        id
      }
      children {
        items {
          value
          parentId
          id
        }
        nextToken
      }
      id
    }
    children {
      items {
        value
        parentId
        parent {
          value
          parentId
          id
        }
        children {
          nextToken
        }
        id
      }
      nextToken
    }
    id
  }
}
` as GeneratedMutation<APITypes.UpdateTreeNodeMutationVariables, APITypes.UpdateTreeNodeMutation>;
export const deleteTreeNode = /* GraphQL */ `mutation DeleteTreeNode(
  $input: DeleteTreeNodeInput!
  $condition: ModelTreeNodeConditionInput
) {
  deleteTreeNode(input: $input, condition: $condition) {
    value
    parentId
    parent {
      value
      parentId
      parent {
        value
        parentId
        parent {
          value
          parentId
          id
        }
        children {
          nextToken
        }
        id
      }
      children {
        items {
          value
          parentId
          id
        }
        nextToken
      }
      id
    }
    children {
      items {
        value
        parentId
        parent {
          value
          parentId
          id
        }
        children {
          nextToken
        }
        id
      }
      nextToken
    }
    id
  }
}
` as GeneratedMutation<APITypes.DeleteTreeNodeMutationVariables, APITypes.DeleteTreeNodeMutation>;
