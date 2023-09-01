import { MYSQL_DB_TYPE, TransformerPluginBase } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPluginType,
  TransformerPreProcessContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode, DirectiveNode, Kind, DefinitionNode, DocumentNode, ObjectTypeExtensionNode } from 'graphql';
import { shouldBeAppliedToModel, getMappedName, updateTypeMapping, setTypeMappingInSchema } from './graphql-name-mapping';

const directiveName = 'refersTo';

const directiveDefinition = `
  directive @${directiveName}(name: String!) on OBJECT | FIELD_DEFINITION
`;

export class RefersToTransformer extends TransformerPluginBase {
  constructor() {
    super(`amplify-refers-to-transformer`, directiveDefinition, TransformerPluginType.GENERIC);
  }

  /**
   * Register any renamed models with the ctx.resourceHelper.
   */
  object = (definition: ObjectTypeDefinitionNode, directive: DirectiveNode, ctx: TransformerSchemaVisitStepContextProvider) => {
    const context = ctx as TransformerContextProvider;
    shouldBeAppliedToModel(definition, directiveName);
    shouldBeAppliedToRDSModels(definition, context);
    const modelName = definition.name.value;
    const mappedName = getMappedName(definition, directive, directiveName, ctx.inputDocument);
    updateTypeMapping(modelName, mappedName, ctx.resourceHelper.setModelNameMapping);
  };

  /**
   * Run pre-mutation steps on the schema to support refersTo
   * @param context The pre-processing context for the transformer, used to store type mappings
   */
  preMutateSchema = (context: TransformerPreProcessContextProvider) => {
    setTypeMappingInSchema(context, directiveName);
  };
}

export const shouldBeAppliedToRDSModels = (
  definition: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  ctx: TransformerContextProvider,
) => {
  const modelName = definition.name.value;
  const dbInfo = ctx.modelToDatasourceMap.get(modelName);
  if (!(dbInfo?.dbType === MYSQL_DB_TYPE)) {
    throw new Error(`${directiveName} is only supported on RDS models. ${modelName} is not an RDS model.`);
  }
};
