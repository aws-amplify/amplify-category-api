import { parse, FieldDefinitionNode, ObjectTypeDefinitionNode, visit } from 'graphql';
import _ from 'lodash';
import { DatasourceType, MYSQL_DB_TYPE } from '@aws-amplify/graphql-transformer-core';

export const checkForUnsupportedDirectives = (schema: string, modelToDatasourceMap: Map<string, DatasourceType>): void => {
  const unsupportedRDSDirectives = ['auth', 'searchable', 'predictions', 'function', 'manyToMany', 'http', 'mapsTo'];
  if (_.isEmpty(schema) || _.isEmpty(modelToDatasourceMap)) {
    return;
  }

  // get all the models in the modelToDatasourceMap that are backed by RDS whose value is present in the db_type property inside the map
  const rdsModels = Array.from(modelToDatasourceMap?.entries())
    .filter(([key, value]) => value?.dbType === MYSQL_DB_TYPE)
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

const unsupportedDirectiveError = (
  directiveName: string,
  fieldName: string | undefined,
  typeName: string,
  unsupportedDirectives: string[],
): Error => {
  return new Error(
    `@${directiveName} directive on type "${typeName}" ${
      fieldName ? `and field "${fieldName}"` : ''
    } is not supported on RDS datasource. Following directives are not supported on RDS datasource: ${unsupportedDirectives.join(', ')}`,
  );
};

const getParentName = (ancestors: any[]): string | undefined => {
  if (ancestors && ancestors?.length > 0) {
    return (ancestors[ancestors.length - 1] as ObjectTypeDefinitionNode)?.name?.value;
  }
};
