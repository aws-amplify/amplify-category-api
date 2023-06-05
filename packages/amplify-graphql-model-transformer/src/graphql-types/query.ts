import { TransformerTransformSchemaStepContextProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { InputObjectTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { FieldWrapper, ObjectDefinitionWrapper } from '@aws-amplify/graphql-transformer-core';
import { makeConditionFilterInput, makeSubscriptionFilterInput } from './common';

/**
 *
 * @param ctx
 * @param name
 * @param object
 */
export const makeListQueryFilterInput = (
  ctx: TransformerTransformSchemaStepContextProvider,
  name: string,
  object: ObjectTypeDefinitionNode,
): InputObjectTypeDefinitionNode => makeConditionFilterInput(ctx, name, object).serialize();

/**
 *
 * @param ctx
 * @param name
 * @param object
 */
export const makeSubscriptionQueryFilterInput = (
  ctx: TransformerTransformSchemaStepContextProvider,
  name: string,
  object: ObjectTypeDefinitionNode,
): InputObjectTypeDefinitionNode => makeSubscriptionFilterInput(ctx, name, object).serialize();

/**
 *
 * @param type
 * @param modelName
 * @param isSyncEnabled
 */
export const makeListQueryModel = (type: ObjectTypeDefinitionNode, modelName: string, isSyncEnabled: boolean): ObjectTypeDefinitionNode => {
  const outputType = ObjectDefinitionWrapper.create(modelName);

  outputType.addField(FieldWrapper.create('items', type.name.value, true, true));
  outputType.addField(FieldWrapper.create('nextToken', 'String', true, false));

  if (isSyncEnabled) {
    outputType.addField(FieldWrapper.create('startedAt', 'AWSTimestamp', true, false));
  }

  return outputType.serialize();
};
