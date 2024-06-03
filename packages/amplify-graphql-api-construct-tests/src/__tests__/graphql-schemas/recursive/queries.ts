/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from './API';
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getTreeNode = /* GraphQL */ `query GetTreeNode($id: ID!) {
  getTreeNode(id: $id) {
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
` as GeneratedQuery<APITypes.GetTreeNodeQueryVariables, APITypes.GetTreeNodeQuery>;
export const listTreeNodes = /* GraphQL */ `query ListTreeNodes(
  $filter: ModelTreeNodeFilterInput
  $limit: Int
  $nextToken: String
) {
  listTreeNodes(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
  }
}
` as GeneratedQuery<APITypes.ListTreeNodesQueryVariables, APITypes.ListTreeNodesQuery>;
