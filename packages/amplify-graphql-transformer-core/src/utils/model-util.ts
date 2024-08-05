import { FieldDefinitionNode, ListValueNode, ObjectTypeDefinitionNode, StringValueNode, ValueNode } from 'graphql';
import { toPascalCase } from 'graphql-transformer-common';
import { getField } from './graphql-utils';

/**
 * Returns the primary key field nodes (that is, the primary key and sort keys) for a given type. If the type does not have an explicitly
 * declared `@primaryKey` directive, this function returns a single field named `id`, of type `ID!`, to reflect the fact that primary keys
 * are implicitly defined on non-SQL models.
 *
 * NOTE: This function will break if invoked on a SQL model without an explicitly declared primary key field, since we don't actually
 * implicitly add `id` fields to SQL models.
 */
export const getPrimaryKeyFieldNodes = (type: ObjectTypeDefinitionNode): FieldDefinitionNode[] => {
  const primaryKeyField = type.fields?.find((f) => f.directives?.some((d) => d.name.value === 'primaryKey'));

  if (!primaryKeyField) {
    return [getImplicitlyDefinedIdField()];
  }

  const primaryKeyDirective = primaryKeyField?.directives?.find((d) => d.name.value === 'primaryKey');
  const result = [primaryKeyField];
  const sortKeys = primaryKeyDirective?.arguments?.find((a) => a.name.value === 'sortKeyFields')?.value as ListValueNode;
  if (sortKeys) {
    const fieldFinder: (fieldName: string) => FieldDefinitionNode | undefined = (fieldName: string) => getField(type, fieldName);
    const sortKeyNames = sortKeys.values.map((v: ValueNode) => (v as StringValueNode).value);
    const sortFields = sortKeyNames.map(fieldFinder);
    for (const sortField of sortFields) {
      if (!sortField) {
        throw new Error(`Invalid sort key field name in primary key directive: ${sortKeyNames}`);
      }
    }
    result.push(...(sortFields as FieldDefinitionNode[]));
  }
  return result;
};

/**
 * Returns the names of the primary key fields (that is, the primary key and sort keys) for the type
 */
export const getPrimaryKeyFields = (type: ObjectTypeDefinitionNode): string[] => {
  return getPrimaryKeyFieldNodes(type).map((f) => f.name.value);
};

export const getFilterInputName = (modelName: string): string => {
  return toPascalCase(['Model', modelName, 'FilterInput']);
};

export const getConditionInputName = (modelName: string): string => {
  return toPascalCase(['Model', modelName, 'ConditionInput']);
};

export const getSubscriptionFilterInputName = (modelName: string): string => {
  return toPascalCase(['ModelSubscription', modelName, 'FilterInput']);
};

export const getConnectionName = (modelName: string): string => {
  return toPascalCase(['Model', modelName, 'Connection']);
};

export const getImplicitlyDefinedIdField = (): FieldDefinitionNode => ({
  kind: 'FieldDefinition',
  name: {
    kind: 'Name',
    value: 'id',
  },
  type: {
    kind: 'NonNullType',
    type: {
      kind: 'NamedType',
      name: {
        kind: 'Name',
        value: 'ID',
      },
    },
  },
});
