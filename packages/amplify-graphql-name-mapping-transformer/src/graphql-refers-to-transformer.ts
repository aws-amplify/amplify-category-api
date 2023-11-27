import { TransformerPluginBase, isSqlModel, InvalidDirectiveError } from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerPluginType,
  TransformerPreProcessContextProvider,
  TransformerSchemaVisitStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  ObjectTypeDefinitionNode,
  DirectiveNode,
  FieldDefinitionNode,
  ObjectTypeExtensionNode,
  InterfaceTypeDefinitionNode,
  Kind,
} from 'graphql';
import {
  shouldBeAppliedToModel,
  getMappedName,
  updateTypeMapping,
  setTypeMappingInSchema,
  getMappedFieldName,
  updateFieldMapping,
} from './graphql-name-mapping';
import { attachFieldMappingSlot } from './field-mapping-resolvers';

const directiveName = 'refersTo';

const directiveDefinition = `
  directive @${directiveName}(name: String!) on OBJECT | FIELD_DEFINITION
`;

export class RefersToTransformer extends TransformerPluginBase {
  constructor() {
    super('amplify-refers-to-transformer', directiveDefinition, TransformerPluginType.GENERIC);
  }

  /**
   * Register any renamed models with the ctx.resourceHelper.
   */
  object = (definition: ObjectTypeDefinitionNode, directive: DirectiveNode, ctx: TransformerSchemaVisitStepContextProvider): void => {
    const context = ctx as TransformerContextProvider;
    shouldBeAppliedToModel(definition, directiveName);
    shouldBeAppliedToRDSModels(definition, context);
    const modelName = definition.name.value;
    const mappedName = getMappedName(definition, directive, directiveName, ctx.inputDocument);
    updateTypeMapping(modelName, mappedName, ctx.resourceHelper.setModelNameMapping);
  };

  /**
   * Register any renamed model fields with the ctx.resourceHelper.
   */
  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    ctx: TransformerSchemaVisitStepContextProvider,
  ): void => {
    if (parent.kind === Kind.INTERFACE_TYPE_DEFINITION) {
      throw new InvalidDirectiveError(
        `@refersTo directive cannot be placed on "${parent?.name?.value}" interface's ${definition?.name?.value} field.`,
      );
    }
    const context = ctx as TransformerContextProvider;
    const modelName = parent?.name?.value;
    shouldBeAppliedToModel(parent, directiveName);
    shouldBeAppliedToRDSModels(parent, context);
    shouldNotBeOnRelationalField(definition, modelName);
    const mappedName = getMappedFieldName(parent, definition, directive, directiveName);
    updateFieldMapping(modelName, definition?.name?.value, mappedName, ctx);
  };

  /**
   * During the generateResolvers step, the refersTo transformer reads all of the model field mappings from the resourceHelper and generates
   * VTL to store the field mappings in the resolver context stash
   */
  after = (context: TransformerContextProvider): void => {
    context.resourceHelper.getModelFieldMapKeys().forEach((modelName) => {
      if (!isSqlModel(context, modelName)) {
        return;
      }
      const modelFieldMap = context.resourceHelper.getModelFieldMap(modelName);
      if (!modelFieldMap.getMappedFields().length) {
        return;
      }

      modelFieldMap.getResolverReferences().forEach(({ typeName, fieldName, isList }) => {
        const resolver = context.resolvers.getResolver(typeName, fieldName);
        if (!resolver) {
          return;
        }
        attachFieldMappingSlot({
          resolver,
          resolverTypeName: typeName,
          resolverFieldName: fieldName,
          fieldMap: modelFieldMap.getMappedFields(),
        });
      });
    });
  };

  /**
   * Run pre-mutation steps on the schema to support refersTo
   * @param context The pre-processing context for the transformer, used to store type mappings
   */
  preMutateSchema = (context: TransformerPreProcessContextProvider): void => {
    setTypeMappingInSchema(context, directiveName);
  };
}

export const shouldBeAppliedToRDSModels = (
  definition: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
  ctx: TransformerContextProvider,
): void => {
  const modelName = definition.name.value;
  if (!isSqlModel(ctx, modelName)) {
    throw new Error(`@${directiveName} is only supported on RDS models. ${modelName} is not an RDS model.`);
  }
};

export const shouldNotBeOnRelationalField = (definition: FieldDefinitionNode, modelName: string): void => {
  const relationalDirectives = ['hasOne', 'hasMany', 'belongsTo', 'manyToMany'];
  if (definition?.directives?.some((directive) => relationalDirectives.includes(directive?.name?.value))) {
    throw new Error(`@${directiveName} is not supported on "${definition?.name?.value}" relational field in "${modelName}" model.`);
  }
};
