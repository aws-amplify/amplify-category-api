import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  InputObjectDefinitionWrapper,
  InvalidDirectiveError,
  isDynamoDbModel,
  MappingTemplate,
  TransformerPluginBase,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerResolverProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DefaultDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  StringValueNode,
  TypeNode,
} from 'graphql';
import { methodCall, printBlock, qref, raw, ref, str } from 'graphql-mapping-template';
import { getBaseType, isEnum, isListType, isScalarOrEnum, ModelResourceIDs, toCamelCase } from 'graphql-transformer-common';
import { DefaultValueDirectiveConfiguration } from './types';
import { TypeValidators } from './validators';

const nonStringTypes = ['Int', 'Float', 'Boolean', 'AWSTimestamp', 'AWSJSON'];

const validateFieldType = (ctx: TransformerSchemaVisitStepContextProvider, type: TypeNode): void => {
  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];
  if (isListType(type) || !isScalarOrEnum(type, enums)) {
    throw new InvalidDirectiveError('The @default directive may only be added to scalar or enum field types.');
  }
};

const validateDirectiveArguments = (directive: DirectiveNode): void => {
  if (directive.arguments!.length === 0) throw new InvalidDirectiveError('The @default directive must have a value property');
  if (directive.arguments!.length > 1) throw new InvalidDirectiveError('The @default directive only takes a value property');
};

const validateModelDirective = (config: DefaultValueDirectiveConfiguration): void => {
  const modelDirective = config.object.directives!.find((dir) => dir.name.value === 'model');
  if (!modelDirective) {
    throw new InvalidDirectiveError('The @default directive may only be added to object definitions annotated with @model.');
  }
};

const validateDefaultValueType = (ctx: TransformerSchemaVisitStepContextProvider, config: DefaultValueDirectiveConfiguration): void => {
  // if field type is non-nullable, ensure value is not null
  if (config.value === null) {
    throw new InvalidDirectiveError('The @default directive does not support null values.');
  }

  // if base field type is enum, may be an enum - validate that argument value in among field type enum's values
  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];
  if (
    enums &&
    isEnum(config.field.type, ctx.inputDocument) &&
    !enums.find((it) => it.name.value === getBaseType(config.field.type))!.values!.find((v) => v.name.value === config.value)
  ) {
    throw new InvalidDirectiveError(`Default value "${config.value}" is not a member of ${getBaseType(config.field.type)} enum.`);
  }

  const typeValidators = new TypeValidators();
  if (!isEnum(config.field.type, ctx.inputDocument) && !typeValidators[getBaseType(config.field.type)](config.value)) {
    throw new InvalidDirectiveError(`Default value "${config.value}" is not a valid ${getBaseType(config.field.type)}.`);
  }
};

const validate = (ctx: TransformerSchemaVisitStepContextProvider, config: DefaultValueDirectiveConfiguration): void => {
  validateModelDirective(config);
  validateFieldType(ctx, config.field.type);
  validateDirectiveArguments(config.directive);

  // Validate the default values only for the DynamoDB datasource.
  // For SQL, the database determines and sets the default value. We will not validate the value in transformers.
  const isDynamoDB = isDynamoDbModel(ctx, config.object.name.value);
  if (isDynamoDB) {
    validateDefaultValueType(ctx, config);
  }
};

export class DefaultValueTransformer extends TransformerPluginBase {
  private directiveMap = new Map<string, DefaultValueDirectiveConfiguration[]>();

  constructor() {
    super('amplify-default-value-transformer', DefaultDirective.definition);
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    ctx: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveWrapped = new DirectiveWrapper(directive);
    const config = directiveWrapped.getArguments(
      {
        object: parent as ObjectTypeDefinitionNode,
        field: definition,
        directive,
      } as DefaultValueDirectiveConfiguration,
      generateGetArgumentsInput(ctx.transformParameters),
    );
    validate(ctx, config);

    if (!this.directiveMap.has(parent.name.value)) {
      this.directiveMap.set(parent.name.value, []);
    }

    this.directiveMap.get(parent.name.value)!.push(config);
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    for (const typeName of this.directiveMap.keys()) {
      const name = ModelResourceIDs.ModelCreateInputObjectName(typeName);
      for (const config of this.directiveMap.get(typeName)!) {
        const input = InputObjectDefinitionWrapper.fromObject(name, config.object, ctx.inputDocument);
        const fieldWrapper = input.fields.find((f) => f.name === config.field.name.value);
        fieldWrapper?.makeNullable();
      }
    }
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const typeName of this.directiveMap.keys()) {
      // Set the default value only for DDB datasource. For RDS, the database will set the value.
      const isDynamoDB = isDynamoDbModel(ctx, typeName);
      if (!isDynamoDB) {
        continue;
      }

      const snippets: string[] = [];
      for (const config of this.directiveMap.get(typeName)!) {
        const fieldName = config.field.name.value;
        const defaultValueArgumentValueNode = config.directive.arguments![0].value as StringValueNode;
        const defaultValue = defaultValueArgumentValueNode.value;
        snippets.push(this.makeDefaultValueSnippet(fieldName, defaultValue, !nonStringTypes.includes(getBaseType(config.field.type))));
      }

      this.updateResolverWithDefaultValues(context, toCamelCase(['create', typeName]), snippets);
    }
  };

  private makeDefaultValueSnippet = (fieldName: string, defaultValue: string, isString: boolean): string =>
    printBlock(`Setting "${fieldName}" to default value of "${defaultValue}"`)(
      qref(
        methodCall(
          ref('context.args.input.put'),
          str(fieldName),
          methodCall(ref('util.defaultIfNull'), ref(`ctx.args.input.${fieldName}`), isString ? str(defaultValue) : raw(defaultValue)),
        ),
      ),
    );

  private updateResolverWithDefaultValues = (ctx: TransformerContextProvider, resolverLogicalId: string, snippets: string[]): void => {
    const resolver = this.getResolverObject(ctx, resolverLogicalId);
    if (resolver) {
      this.addSnippetToResolverSlot(resolver, snippets);
    }
  };

  private getResolverObject = (ctx: TransformerContextProvider, resolverLogicalId: string): TransformerResolverProvider | null => {
    const objectName = ctx.output.getMutationTypeName();

    if (!objectName) {
      return null;
    }

    return ctx.resolvers.getResolver(objectName, resolverLogicalId) ?? null;
  };

  private addSnippetToResolverSlot = (resolver: TransformerResolverProvider, snippets: string[]): void => {
    const res = resolver as any;
    res.addToSlot(
      'init',
      MappingTemplate.s3MappingTemplateFromString(
        // eslint-disable-next-line prefer-template
        snippets.join('\n') + '\n{}',
        `${res.typeName}.${res.fieldName}.{slotName}.{slotIndex}.req.vtl`,
      ),
    );
  };
}
