import { TransformerPluginBase, isSqlModel, isDynamoDbModel } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPluginType,
  TransformerPreProcessContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { MapsToDirective } from '@aws-amplify/graphql-directives';
import { ObjectTypeDefinitionNode, DirectiveNode, ObjectTypeExtensionNode } from 'graphql';
import { createMappingLambda } from './field-mapping-lambda';
import { attachFilterAndConditionInputMappingSlot, attachInputMappingSlot, attachResponseMappingSlot } from './field-mapping-resolvers';
import { shouldBeAppliedToModel, getMappedName, updateTypeMapping, setTypeMappingInSchema } from './graphql-name-mapping';

export class MapsToTransformer extends TransformerPluginBase {
  constructor() {
    super('amplify-maps-to-transformer', MapsToDirective.definition, TransformerPluginType.GENERIC);
  }

  /**
   * During the AST tree walking, the mapsTo transformer registers any renamed models with the ctx.resourceHelper.
   */
  object = (definition: ObjectTypeDefinitionNode, directive: DirectiveNode, ctx: TransformerSchemaVisitStepContextProvider): void => {
    shouldBeAppliedToModel(definition, MapsToDirective.name);
    shouldBeAppliedToDDBModels(definition, ctx as TransformerContextProvider);
    const modelName = definition.name.value;
    const mappedName = getMappedName(definition, directive, MapsToDirective.name, ctx.inputDocument);
    updateTypeMapping(modelName, mappedName, ctx.resourceHelper.setModelNameMapping);
  };

  /**
   * Run pre-mutation steps on the schema to support mapsTo
   * @param context The pre-processing context for the transformer, used to store type mappings
   */
  preMutateSchema = (context: TransformerPreProcessContextProvider): void => {
    setTypeMappingInSchema(context, MapsToDirective.name);
  };

  /**
   * During the generateResolvers step, the mapsTo transformer reads all of the model field mappings from the resourceHelper and generates
   * VTL to map the current field names to the original field names
   */
  after = (context: TransformerContextProvider): void => {
    context.resourceHelper.getModelFieldMapKeys().forEach((modelName) => {
      if (isSqlModel(context, modelName)) {
        return;
      }
      const modelFieldMap = context.resourceHelper.getModelFieldMap(modelName);
      if (!modelFieldMap.getMappedFields().length) {
        return;
      }
      const lambdaDataSource = createMappingLambda(context.api.host, context.stackManager);
      modelFieldMap.getResolverReferences().forEach(({ typeName, fieldName, isList }) => {
        const resolver = context.resolvers.getResolver(typeName, fieldName);
        if (!resolver) {
          return;
        }
        if (typeName === 'Mutation') {
          attachInputMappingSlot({
            resolver,
            resolverTypeName: typeName,
            resolverFieldName: fieldName,
            fieldMap: modelFieldMap.getMappedFields(),
          });
          attachFilterAndConditionInputMappingSlot({
            slotName: 'preUpdate',
            resolver,
            resolverTypeName: typeName,
            resolverFieldName: fieldName,
            fieldMap: modelFieldMap.getMappedFields(),
            dataSource: lambdaDataSource,
          });
          attachResponseMappingSlot({
            slotName: 'postUpdate',
            resolver,
            resolverTypeName: typeName,
            resolverFieldName: fieldName,
            fieldMap: modelFieldMap.getMappedFields(),
            isList: false,
          });
        } else {
          attachFilterAndConditionInputMappingSlot({
            slotName: 'preDataLoad',
            resolver,
            resolverTypeName: typeName,
            resolverFieldName: fieldName,
            fieldMap: modelFieldMap.getMappedFields(),
            dataSource: lambdaDataSource,
          });
          attachResponseMappingSlot({
            slotName: 'postDataLoad',
            resolver,
            resolverTypeName: typeName,
            resolverFieldName: fieldName,
            fieldMap: modelFieldMap.getMappedFields(),
            isList,
          });
        }
      });
    });
  };
}

export const shouldBeAppliedToDDBModels = (
  definition: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  ctx: TransformerContextProvider,
): void => {
  const modelName = definition.name.value;
  if (!isDynamoDbModel(ctx, modelName)) {
    throw new Error(`${MapsToDirective.name} is only supported on DynamoDB models. ${modelName} is not a DDB model.`);
  }
};
