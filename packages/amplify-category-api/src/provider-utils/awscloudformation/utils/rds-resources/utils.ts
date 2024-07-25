import { parse, FieldDefinitionNode, ObjectTypeDefinitionNode, visit } from 'graphql';
import _ from 'lodash';
import { isSqlStrategy } from '@aws-amplify/graphql-transformer-core';
import {
  DataSourceStrategiesProvider,
  ModelDataSourceStrategy,
  SqlDirectiveDataSourceStrategy,
} from '@aws-amplify/graphql-transformer-interfaces';

export const checkForUnsupportedDirectives = (schema: string, context: DataSourceStrategiesProvider): void => {
  const unsupportedRDSDirectives = ['searchable', 'predictions', 'function', 'manyToMany', 'http', 'mapsTo'];
  if (_.isEmpty(schema) || _.isEmpty(context.dataSourceStrategies)) {
    return;
  }

  const rdsModels = Object.entries(context.dataSourceStrategies)
    .filter(([key, value]) => isSqlStrategy(value))
    .map(([key, value]) => key);

  if (_.isEmpty(rdsModels)) {
    return;
  }

  const document = parse(schema);
  const schemaVisitor = {
    FieldDefinition: {
      enter(node: FieldDefinitionNode, key, parent, path, ancestors): any {
        const parentName = getParentName(ancestors);
        if (!(parentName === 'Query') && !rdsModels?.includes(parentName)) {
          return;
        }
        node?.directives?.map((directive) => {
          if (unsupportedRDSDirectives.includes(directive?.name?.value)) {
            throw unsupportedDirectiveError(directive?.name?.value, node?.name?.value, parentName, unsupportedRDSDirectives);
          }
        });
      },
    },
    ObjectTypeDefinition: {
      enter(node: ObjectTypeDefinitionNode): any {
        const typeName = node?.name?.value;
        if (!(typeName === 'Query') && !rdsModels?.includes(typeName)) {
          return;
        }
        node?.directives?.map((directive) => {
          if (unsupportedRDSDirectives.includes(directive?.name?.value)) {
            throw unsupportedDirectiveError(directive?.name?.value, undefined, node?.name?.value, unsupportedRDSDirectives);
          }
        });
      },
    },
  };

  visit(document, schemaVisitor);
};

export const containsSqlModelOrDirective = (
  dataSourceStrategies: Record<string, ModelDataSourceStrategy>,
  sqlDirectiveDataSourceStrategies?: SqlDirectiveDataSourceStrategy[],
): boolean => {
  if (sqlDirectiveDataSourceStrategies && sqlDirectiveDataSourceStrategies?.length > 0) {
    return true;
  }
  return Object.values(dataSourceStrategies).some((strategy) => isSqlStrategy(strategy));
};

const unsupportedDirectiveError = (
  directiveName: string,
  fieldName: string | undefined,
  typeName: string,
  unsupportedDirectives: string[],
): Error => {
  return new Error(
    `@${directiveName} directive on type "${typeName}" ${
      fieldName ? `and field "${fieldName}"` : ''
    } is not supported on a SQL datasource. Following directives are not supported on a SQL datasource: ${unsupportedDirectives.join(
      ', ',
    )}`,
  );
};

const getParentName = (ancestors: any[]): string | undefined => {
  if (ancestors && ancestors?.length > 0) {
    return (ancestors[ancestors.length - 1] as ObjectTypeDefinitionNode)?.name?.value;
  }
  return undefined;
};
