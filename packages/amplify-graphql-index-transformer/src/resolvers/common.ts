import { TransformerContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { DynamoDbDataSource } from '@aws-cdk/aws-appsync';
import { Table } from '@aws-cdk/aws-dynamodb';
import { ObjectTypeDefinitionNode } from 'graphql';
import {
  ModelResourceIDs
} from 'graphql-transformer-common';
import {
  compoundExpression, iff, methodCall, not,
  obj, printBlock, ref, str,
  notEquals,
  toJson
} from 'graphql-mapping-template';
import { Kind, TypeNode } from 'graphql';
import {
  and,
  block, Expression, raw, set
} from 'graphql-mapping-template';
import {
  applyKeyExpressionForCompositeKey,
  attributeTypeFromScalar,
  getBaseType, ResourceConstants
} from 'graphql-transformer-common';
import { PrimaryKeyDirectiveConfiguration } from '../types';
const API_KEY = 'API Key Authorization';

export function getTable(context: TransformerContextProvider, object: ObjectTypeDefinitionNode): Table {
  const ddbDataSource = context.dataSources.get(object) as DynamoDbDataSource;
  const tableName = ModelResourceIDs.ModelTableResourceID(object.name.value);
  const table = ddbDataSource.ds.stack.node.findChild(tableName) as Table;

  if (!table) {
    throw new Error(`Table not found in stack with table name ${tableName}`);
  }
  return table;
}

/**
 * Util function to generate sandbox mode expression
 */
export function generateAuthExpressionForSandboxMode(enabled: boolean): string {
  let exp;

  if (enabled) exp = iff(notEquals(methodCall(ref('util.authType')), str(API_KEY)), methodCall(ref('util.unauthorized')));
  else exp = methodCall(ref('util.unauthorized'));

  return printBlock(`Sandbox Mode ${enabled ? 'Enabled' : 'Disabled'}`)(
    compoundExpression([iff(not(ref('ctx.stash.get("hasAuth")')), exp), toJson(obj({}))]),
  );
};

export function attributeTypeFromType(type: TypeNode, ctx: TransformerContextProvider) {
  const baseTypeName = getBaseType(type);
  const ofType = ctx.output.getType(baseTypeName);
  if (ofType && ofType.kind === Kind.ENUM_TYPE_DEFINITION) {
    return 'S';
  }
  return attributeTypeFromScalar(type);
}

export function setQuerySnippet(config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider, isListResolver: boolean) {
  const { field, sortKey, sortKeyFields } = config;
  const keyFields = [field, ...sortKey];
  const keyNames = [field.name.value, ...sortKeyFields];
  const keyTypes = keyFields.map(k => attributeTypeFromType(k.type, ctx));
  const expressions: Expression[] = [];

  if (keyNames.length === 1) {
    const sortDirectionValidation = iff(
      raw('!$util.isNull($ctx.args.sortDirection)'),
      raw('$util.error("sortDirection is not supported for List operations without a Sort key defined.", "InvalidArgumentsError")'),
    );

    expressions.push(sortDirectionValidation);
  } else if (isListResolver === true && keyNames.length >= 1) {
    // This check is only needed for List queries.
    const sortDirectionValidation = iff(
      and([raw(`$util.isNull($ctx.args.${keyNames[0]})`), raw('!$util.isNull($ctx.args.sortDirection)')]),
      raw(
        `$util.error("When providing argument 'sortDirection' you must also provide argument '${keyNames[0]}'.", "InvalidArgumentsError")`,
      ),
    );

    expressions.push(sortDirectionValidation);
  }

  expressions.push(
    set(ref(ResourceConstants.SNIPPETS.ModelQueryExpression), obj({})),
    applyKeyExpressionForCompositeKey(keyNames, keyTypes, ResourceConstants.SNIPPETS.ModelQueryExpression)!,
  );

  return block('Set query expression for key', expressions);
}

export function attributeDefinitions(config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider) {
  const { field, sortKey, sortKeyFields } = config;
  const definitions = [{ attributeName: field.name.value, attributeType: attributeTypeFromType(field.type, ctx) }];

  if (sortKeyFields.length === 1) {
    definitions.push({
      attributeName: sortKeyFields[0],
      attributeType: attributeTypeFromType(sortKey[0].type, ctx),
    });
  } else if (sortKeyFields.length > 1) {
    definitions.push({
      attributeName: getSortKeyName(config),
      attributeType: 'S',
    });
  }

  return definitions;
}

export function getSortKeyName(config: PrimaryKeyDirectiveConfiguration): string {
  return config.sortKeyFields.join(ModelResourceIDs.ModelCompositeKeySeparator());
}

export function getDBType(ctx: TransformerContextProvider, modelName: string) {
  const dbInfo = ctx.modelToDatasourceMap.get(modelName);
  const dbType = dbInfo ? dbInfo.dbType : 'DDB';
  return dbType;
}
