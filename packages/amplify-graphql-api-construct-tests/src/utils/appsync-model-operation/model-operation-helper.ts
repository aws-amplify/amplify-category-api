import { join } from 'path';
import _ from 'lodash';
import * as fs from 'fs-extra';
import { parse, ObjectTypeDefinitionNode, Kind, visit, FieldDefinitionNode, StringValueNode, valueFromASTUntyped, TypeNode } from 'graphql';
import axios from 'axios';
import {
  getProjectMeta,
  RDSTestDataProvider,
  createRDSInstance,
  addRDSPortInboundRule,
  getAppSyncApi,
} from 'amplify-category-api-e2e-core';
import { getBaseType, isArrayOrObject, isListType, toPascalCase } from 'graphql-transformer-common';
import path from 'path';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { GQLQueryHelper } from './query-helper';

export const createModelOperationHelpers = (appSyncClient: any, schema: string) => {
  const document = parse(schema);
  const modelOperationHelpers: { [key: string]: GQLQueryHelper } = {};
  const schemaVisitor = {
    ObjectTypeDefinition: {
      leave: (node: ObjectTypeDefinitionNode, key, parent, path, ancestors) => {
        const modelName = node.name.value;
        const selectionSetFields = node.fields.map((f) => f.name.value);
        const selectionSet = /* GraphQL */ `
          ${selectionSetFields.join('\n')}
        `;
        const primaryKeyField = selectionSetFields[0];
        const getSelectionSet = /* GraphQL */ `
          query Get${modelName}($${primaryKeyField}: ID!) {
            get${modelName}(${primaryKeyField}: $${primaryKeyField}) {
              ${selectionSetFields.join('\n')}
            }
          }
        `;
        const listSelectionSet = /* GraphQL */ `
          query List${modelName}s {
            list${modelName}s {
              items {
                ${selectionSetFields.join('\n')}
              }
            }
          }
        `;
        const subscriptionSelectionSet = (operation: string): string => {
          return /* GraphQL */ `
            subscription On${toPascalCase([operation])}${modelName} {
              on${toPascalCase([operation])}${modelName} {
                ${selectionSetFields.join('\n')}
              }
            }
          `;
        };
        const helper = new GQLQueryHelper(appSyncClient, modelName, {
          mutation: {
            create: selectionSet,
            update: selectionSet,
            delete: selectionSet,
          },
          query: {
            get: getSelectionSet,
            list: listSelectionSet,
          },
          subscription: {
            onCreate: subscriptionSelectionSet('create'),
            onUpdate: subscriptionSelectionSet('update'),
            onDelete: subscriptionSelectionSet('delete'),
          },
        });

        modelOperationHelpers[modelName] = helper;
      },
    },
  };
  visit(document, schemaVisitor);
  return modelOperationHelpers;
};

export const checkOperationResult = (
  result: any,
  expected: any,
  resultSetName: string,
  isList: boolean = false,
  errors?: string[],
): void => {
  expect(result).toBeDefined();
  expect(result.data).toBeDefined();
  expect(result.data[resultSetName]).toBeDefined();
  delete result.data[resultSetName]['__typename'];
  if (!isList) {
    expect(result.data[resultSetName]).toEqual(expected);
    return;
  }
  expect(result.data[resultSetName].items).toHaveLength(expected?.length);
  result.data[resultSetName]?.items?.forEach((item: any, index: number) => {
    delete item['__typename'];
    expect(item).toEqual(expected[index]);
  });

  if (errors && errors.length > 0) {
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(errors.length);
    errors.map((error: string) => {
      expect(result.errors).toContain(error);
    });
  }
};

export const checkListItemExistence = (
  result: any,
  resultSetName: string,
  primaryKeyValue: string,
  shouldExist = false,
  primaryKeyName = 'id',
) => {
  expect(result.data[`${resultSetName}`]).toBeDefined();
  expect(result.data[`${resultSetName}`].items).toBeDefined();
  expect(result.data[`${resultSetName}`].items?.filter((item: any) => item[primaryKeyName] === primaryKeyValue)?.length).toEqual(
    shouldExist ? 1 : 0,
  );
};
