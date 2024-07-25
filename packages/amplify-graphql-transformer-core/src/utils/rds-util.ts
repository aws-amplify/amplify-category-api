import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { EnumTypeDefinitionNode, FieldDefinitionNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { compoundExpression, Expression, iff, list, methodCall, not, obj, qref, ref, set, str } from 'graphql-mapping-template';
import { isArrayOrObject, isListType } from 'graphql-transformer-common';
import _ from 'lodash';
import path from 'path';

import { APICategory } from './api-category';

const getParameterNameForDBSecret = (secret: string, secretsKey: string): string => {
  return `${secretsKey}_${secret}`;
};

/* This adheres to the following convention:
  /amplify/<appId>/<envName>/AMPLIFY_${categoryName}${resourceName}${paramName}
  where paramName is secretsKey_<secretName>
*/
export const getParameterStoreSecretPath = (
  secret: string,
  secretsKey: string,
  apiName: string,
  environmentName: string,
  appId: string,
): string => {
  if (_.isEmpty(appId)) {
    throw new Error('Unable to read the App ID');
  }
  const categoryName = APICategory;
  const paramName = getParameterNameForDBSecret(secret, secretsKey);

  if (!environmentName) {
    throw new Error('Unable to create RDS secret path, environment not found/defined');
  }
  return path.posix.join('/amplify', appId, environmentName, `AMPLIFY_${categoryName}${apiName}${paramName}`);
};

export const getNonScalarFields = (object: ObjectTypeDefinitionNode | undefined, ctx: TransformerContextProvider): string[] => {
  if (!object) {
    return [];
  }
  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];
  return object.fields?.filter((f: FieldDefinitionNode) => isArrayOrObject(f.type, enums)).map((f) => f.name.value) || [];
};

export const getArrayFields = (object: ObjectTypeDefinitionNode | undefined, ctx: TransformerContextProvider): string[] => {
  if (!object) {
    return [];
  }
  return object.fields?.filter((f: FieldDefinitionNode) => isListType(f.type)).map((f) => f.name.value) || [];
};

export const constructNonScalarFieldsStatement = (tableName: string, ctx: TransformerContextProvider): Expression =>
  set(ref('lambdaInput.args.metadata.nonScalarFields'), list(getNonScalarFields(ctx.output.getObject(tableName), ctx).map(str)));

export const constructArrayFieldsStatement = (tableName: string, ctx: TransformerContextProvider): Expression =>
  set(ref('lambdaInput.args.metadata.arrayFields'), list(getArrayFields(ctx.output.getObject(tableName), ctx).map(str)));

export const constructFieldMappingInput = (): Expression => {
  return compoundExpression([
    set(ref('lambdaInput.args.metadata.fieldMap'), obj({})),
    qref(
      methodCall(
        ref('lambdaInput.args.metadata.fieldMap.putAll'),
        methodCall(ref('util.defaultIfNull'), ref('context.stash.fieldMap'), obj({})),
      ),
    ),
  ]);
};

export const constructAuthFilterStatement = (keyName: string, emptyAuthFilter: boolean = false): Expression => {
  if (emptyAuthFilter) {
    return set(ref(keyName), obj({}));
  }
  return iff(not(methodCall(ref('util.isNullOrEmpty'), ref('ctx.stash.authFilter'))), set(ref(keyName), ref('ctx.stash.authFilter')));
};
