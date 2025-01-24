import {
  DirectiveWrapper,
  generateGetArgumentsInput,
  InvalidDirectiveError,
  TransformerPluginBase,
  isSqlDbType,
  getModelDataSourceStrategy,
} from '@aws-amplify/graphql-transformer-core';
import {
  TransformerContextProvider,
  TransformerResolverProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { PrimaryKeyDirective } from '@aws-amplify/graphql-directives';
import {
  DirectiveNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { isListType, isNonNullType, isScalarOrEnum, makeInputValueDefinition, makeNamedType } from 'graphql-transformer-common';
import { constructSyncVTL, getVTLGenerator } from './resolvers/resolvers';
import {
  addKeyConditionInputs,
  removeAutoCreatedPrimaryKey,
  updateGetField,
  updateInputObjects,
  updateMutationConditionInput,
  createHashField,
  ensureModelSortDirectionEnum,
  tryAndCreateSortField,
} from './schema';
import { PrimaryKeyDirectiveConfiguration } from './types';
import { validateNotSelfReferencing, validateNotOwnerAuth, lookupResolverName } from './utils';

export class PrimaryKeyTransformer extends TransformerPluginBase {
  private directiveList: PrimaryKeyDirectiveConfiguration[] = [];

  private resolverMap: Map<TransformerResolverProvider, string> = new Map();

  constructor() {
    super('amplify-primary-key-transformer', PrimaryKeyDirective.definition);
  }

  field = (
    parent: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
    definition: FieldDefinitionNode,
    directive: DirectiveNode,
    context: TransformerSchemaVisitStepContextProvider,
  ): void => {
    const directiveWrapped = new DirectiveWrapper(directive);
    const args = directiveWrapped.getArguments(
      {
        object: parent as ObjectTypeDefinitionNode,
        field: definition,
        directive,
      } as PrimaryKeyDirectiveConfiguration,
      generateGetArgumentsInput(context.transformParameters),
    );

    if (!args.sortKeyFields) {
      args.sortKeyFields = [];
    } else if (!Array.isArray(args.sortKeyFields)) {
      args.sortKeyFields = [args.sortKeyFields];
    }

    args.sortKey = [];

    validate(args, context as TransformerContextProvider);
    this.directiveList.push(args);
  };

  public after = (ctx: TransformerContextProvider): void => {
    if (!ctx.isProjectUsingDataStore()) return;

    // construct sync VTL code
    this.resolverMap.forEach((syncVTLContent, resource) => {
      if (syncVTLContent) {
        constructSyncVTL(syncVTLContent, resource);
      }
    });
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    const context = ctx as TransformerContextProvider;

    for (const config of this.directiveList) {
      updateGetField(config, context);
      updateListField(config, context);
      updateInputObjects(config, context);
      removeAutoCreatedPrimaryKey(config, context);
      addKeyConditionInputs(config, context);
      updateMutationConditionInput(config, context);
    }
  };

  generateResolvers = (ctx: TransformerContextProvider): void => {
    for (const config of this.directiveList) {
      const dbType = getModelDataSourceStrategy(ctx, config.object.name.value).dbType;
      const vtlGenerator = getVTLGenerator(dbType);
      vtlGenerator.generatePrimaryKeyVTL(config, ctx, this.resolverMap);
    }
  };
}

const validate = (config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const { object, field, sortKeyFields } = config;

  validateNotSelfReferencing(config);

  const modelDirective = object.directives!.find((directive) => {
    return directive.name.value === 'model';
  });

  if (!modelDirective) {
    throw new InvalidDirectiveError(
      `The @${PrimaryKeyDirective.name} directive may only be added to object definitions annotated with @model.`,
    );
  }

  config.modelDirective = modelDirective;

  const fieldMap = new Map<string, FieldDefinitionNode>();

  for (const objectField of object.fields!) {
    fieldMap.set(objectField.name.value, objectField);

    if (field === objectField) {
      continue;
    }

    for (const directive of objectField.directives!) {
      if (directive.name.value === PrimaryKeyDirective.name) {
        throw new InvalidDirectiveError(`You may only supply one primary key on type '${object.name.value}'.`);
      }
    }
  }

  if (!isNonNullType(field.type)) {
    throw new InvalidDirectiveError(`The primary key on type '${object.name.value}' must reference non-null fields.`);
  }

  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];

  if (!isScalarOrEnum(field.type, enums) || isListType(field.type)) {
    throw new InvalidDirectiveError(`The primary key on type '${object.name.value}.${field.name.value}' cannot be a non-scalar.`);
  }

  for (const sortKeyFieldName of sortKeyFields) {
    const sortField = fieldMap.get(sortKeyFieldName);

    if (!sortField) {
      throw new InvalidDirectiveError(
        `Can't find field '${sortKeyFieldName}' in ${object.name.value}, but it was specified in the primary key.`,
      );
    }

    if (!isScalarOrEnum(sortField.type, enums) || isListType(sortField.type)) {
      throw new InvalidDirectiveError(
        `The primary key's sort key on type '${object.name.value}.${sortField.name.value}' cannot be a non-scalar.`,
      );
    }

    if (!isNonNullType(sortField.type)) {
      throw new InvalidDirectiveError(`The primary key on type '${object.name.value}' must reference non-null fields.`);
    }

    if (!validateNotOwnerAuth(sortKeyFieldName, config, ctx)) {
      throw new InvalidDirectiveError(
        `The primary key's sort key type '${sortKeyFieldName}' cannot be used as an owner @auth field too. Please use another field for the sort key.`,
      );
    }

    config.sortKey.push(sortField);
  }
};

export const updateListField = (config: PrimaryKeyDirectiveConfiguration, ctx: TransformerContextProvider): void => {
  const resolverName = lookupResolverName(config, ctx, 'list');
  let query = ctx.output.getQuery();

  if (!(resolverName && query)) {
    return;
  }

  let listField = query.fields!.find((field: FieldDefinitionNode) => field.name.value === resolverName) as FieldDefinitionNode;
  if (listField) {
    const args = [createHashField(config)];
    const dbType = getModelDataSourceStrategy(ctx, config.object.name.value).dbType;

    if (!dbType || !isSqlDbType(dbType)) {
      const sortField = tryAndCreateSortField(config, ctx);
      if (sortField) {
        args.push(sortField);
      }
    }

    if (Array.isArray(listField.arguments)) {
      args.push(...listField.arguments);
    }

    args.push(makeInputValueDefinition('sortDirection', makeNamedType('ModelSortDirection')));
    ensureModelSortDirectionEnum(ctx);

    listField = { ...listField, arguments: args };
    query = {
      ...query,
      fields: query.fields!.map((field: FieldDefinitionNode) => {
        return field.name.value === listField.name.value ? listField : field;
      }),
    };
    ctx.output.updateObject(query);
  }
};
