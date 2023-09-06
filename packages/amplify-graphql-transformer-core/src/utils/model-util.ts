import { ListValueNode, ObjectTypeDefinitionNode, StringValueNode } from 'graphql';
import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MYSQL_DB_TYPE } from '../types';

export const getPrimaryKeyFields = (type: ObjectTypeDefinitionNode): string[] => {
  const primaryKeyField = type.fields?.find((f) => f.directives?.some((d) => d.name.value === 'primaryKey'));
  if (!primaryKeyField) {
    return ['id'];
  }
  const primaryKeyDirective = primaryKeyField?.directives?.find((d) => d.name.value === 'primaryKey');
  const result = [primaryKeyField.name.value];
  const sortKeys = primaryKeyDirective?.arguments?.find((a) => a.name.value === 'sortKeyFields')?.value as ListValueNode;
  if (sortKeys) {
    result.push(...sortKeys.values.map((v) => (v as StringValueNode).value as string));
  }
  return result;
};

export const isRDSModel = (context: TransformerContextProvider, modelName: string) => {
  if (context.modelToDatasourceMap && context.modelToDatasourceMap.get(modelName)) {
    return context.modelToDatasourceMap.get(modelName)?.dbType === MYSQL_DB_TYPE;
  }
};
