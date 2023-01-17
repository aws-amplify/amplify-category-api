import {
  DirectiveWrapper,
  FieldWrapper,
  generateGetArgumentsInput,
  getFieldNameFor,
  InputObjectDefinitionWrapper,
  InvalidDirectiveError,
  MappingTemplate,
  ObjectDefinitionWrapper,
  SyncConfig,
  SyncUtils,
  TransformerModelBase,
} from '@aws-amplify/graphql-transformer-core';
import {
  AppSyncDataSourceType,
  DataSourceInstance,
  DataSourceProvider,
  MutationFieldType,
  QueryFieldType,
  SubscriptionFieldType,
  TransformerContextProvider,
  TransformerModelProvider,
  TransformerPrepareStepContextProvider,
  TransformerResolverProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
  TransformerValidationStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  DirectiveNode, DocumentNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  ObjectTypeDefinitionNode,
} from 'graphql';
import {
  getBaseType,
  isScalar,
  makeArgument,
  makeDirective,
  makeField,
  makeInputValueDefinition,
  makeNamedType,
  makeNonNullType,
  makeValueNode,
  ResolverResourceIDs,
  toCamelCase,
  toPascalCase,
} from 'graphql-transformer-common';
import {
  addDirectivesToOperation,
  addModelConditionInputs,
  createEnumModelFilters,
  extendTypeWithDirectives,
  makeCreateInputField,
  makeDeleteInputField,
  makeListQueryFilterInput,
  makeSubscriptionQueryFilterInput,
  makeListQueryModel,
  makeModelSortDirectionEnumObject,
  makeMutationConditionInput,
  makeUpdateInputField,
  propagateApiKeyToNestedTypes,
} from './graphql-types';
import {
  generateResolverKey,
  generateSubscriptionRequestTemplate,
  generateSubscriptionResponseTemplate,
} from './resolvers';
import { API_KEY_DIRECTIVE } from './definitions';
import { ModelDirectiveConfiguration, SubscriptionLevel } from './directive';

/**
 * Nullable
 */
export type Nullable<T> = T | null;

export const directiveDefinition = /* GraphQl */ `
  directive @model(
    queries: ModelQueryMap
    mutations: ModelMutationMap
    subscriptions: ModelSubscriptionMap
    timestamps: TimestampConfiguration
  ) on OBJECT
  input ModelMutationMap {
    create: String
    update: String
    delete: String
  }
  input ModelQueryMap {
    get: String
    list: String
  }
  input ModelSubscriptionMap {
    onCreate: [String]
    onUpdate: [String]
    onDelete: [String]
    level: ModelSubscriptionLevel
  }
  enum ModelSubscriptionLevel {
    off
    public
    on
  }
  input TimestampConfiguration {
    createdAt: String
    updatedAt: String
  }
`;

type ModelTransformerOptions = {
  EnableDeletionProtection?: boolean;
  SyncConfig?: SyncConfig;
};

/**
 * ModelTransformer
 */
export abstract class GenericModelTransformer extends TransformerModelBase implements TransformerModelProvider {
  protected options: ModelTransformerOptions = {};
  protected datasourceMap: Record<string, DataSourceProvider> = {};
  protected dataSourceInstanceMap: Record<string, DataSourceInstance> = {};
  protected resolverMap: Record<string, TransformerResolverProvider> = {};
  protected typesWithModelDirective: Set<string> = new Set();
  /**
   * A Map to hold the directive configuration
   */
  protected modelDirectiveConfig: Map<string, ModelDirectiveConfiguration> = new Map();
  protected constructor(name: string, document: DocumentNode | string) {
    super(name, document);
  }

  object = (definition: ObjectTypeDefinitionNode, directive: DirectiveNode, ctx: TransformerSchemaVisitStepContextProvider): void => {
    const isTypeNameReserved = definition.name.value === ctx.output.getQueryTypeName()
      || definition.name.value === ctx.output.getMutationTypeName()
      || definition.name.value === ctx.output.getSubscriptionTypeName();

    if (isTypeNameReserved) {
      throw new InvalidDirectiveError(
        `'${definition.name.value}' is a reserved type name and currently in use within the default schema element.`,
      );
    }
    // todo: get model configuration with default values and store it in the map
    const typeName = definition.name.value;

    if (ctx.isProjectUsingDataStore()) {
      SyncUtils.validateResolverConfigForType(ctx, typeName);
    }

    const directiveWrapped: DirectiveWrapper = new DirectiveWrapper(directive);
    const options = directiveWrapped.getArguments({
      queries: {
        get: getFieldNameFor('get', typeName),
        list: getFieldNameFor('list', typeName),
        ...(ctx.isProjectUsingDataStore() ? { sync: getFieldNameFor('sync', typeName) } : undefined),
      },
      mutations: {
        create: getFieldNameFor('create', typeName),
        update: getFieldNameFor('update', typeName),
        delete: getFieldNameFor('delete', typeName),
      },
      subscriptions: {
        level: SubscriptionLevel.on,
        onCreate: [getFieldNameFor('onCreate', typeName)],
        onDelete: [getFieldNameFor('onDelete', typeName)],
        onUpdate: [getFieldNameFor('onUpdate', typeName)],
      },
      timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    }, generateGetArgumentsInput(ctx.featureFlags));

    // This property override is specifically to address parity between V1 and V2 when the FF is disabled
    // If one subscription is defined, just let the others go to null without FF. But if public and none defined, default all subs
    if (!ctx.featureFlags.getBoolean('shouldDeepMergeDirectiveConfigDefaults', false)) {
      const publicSubscriptionDefaults = {
        onCreate: [getFieldNameFor('onCreate', typeName)],
        onDelete: [getFieldNameFor('onDelete', typeName)],
        onUpdate: [getFieldNameFor('onUpdate', typeName)],
      };

      const baseArgs = directiveWrapped.getArguments(
        {
          subscriptions: {
            level: SubscriptionLevel.on,
            ...publicSubscriptionDefaults,
          },
        },
        generateGetArgumentsInput(ctx.featureFlags),
      );
      if (baseArgs?.subscriptions?.level === SubscriptionLevel.public
        && !(baseArgs?.subscriptions?.onCreate || baseArgs?.subscriptions?.onDelete || baseArgs?.subscriptions?.onUpdate)) {
        options.subscriptions = { level: SubscriptionLevel.public, ...publicSubscriptionDefaults };
      }
    }

    if (options.subscriptions?.onCreate && !Array.isArray(options.subscriptions.onCreate)) {
      options.subscriptions.onCreate = [options.subscriptions.onCreate];
    }

    if (options.subscriptions?.onDelete && !Array.isArray(options.subscriptions.onDelete)) {
      options.subscriptions.onDelete = [options.subscriptions.onDelete];
    }

    if (options.subscriptions?.onUpdate && !Array.isArray(options.subscriptions.onUpdate)) {
      options.subscriptions.onUpdate = [options.subscriptions.onUpdate];
    }

    this.modelDirectiveConfig.set(typeName, options);
    this.typesWithModelDirective.add(typeName);
  };

  prepare = (context: TransformerPrepareStepContextProvider): void => {
    this.typesWithModelDirective.forEach(modelTypeName => {
      const type = context.output.getObject(modelTypeName);
      context.providerRegistry.registerDataSourceProvider(type!, this);
    });
  };

  transformSchema = (ctx: TransformerTransformSchemaStepContextProvider): void => {
    // add the model input conditions
    addModelConditionInputs(ctx);

    this.ensureModelSortDirectionEnum(ctx);
    this.typesWithModelDirective.forEach(type => {
      const def = ctx.output.getObject(type)!;
      const hasAuth = def.directives!.some(dir => dir.name.value === 'auth');

      // add Non Model type inputs
      this.createNonModelInputs(ctx, def);

      const queryFields = this.createQueryFields(ctx, def);
      ctx.output.addQueryFields(queryFields);

      const mutationFields = this.createMutationFields(ctx, def);
      ctx.output.addMutationFields(mutationFields);

      const subscriptionsFields = this.createSubscriptionFields(ctx, def!);
      ctx.output.addSubscriptionFields(subscriptionsFields);

      // Update the field with auto generatable Fields
      this.addAutoGeneratableFields(ctx, type);

      if (ctx.isProjectUsingDataStore()) {
        this.addModelSyncFields(ctx, type);
      }
      // global auth check
      if (!hasAuth && ctx.sandboxModeEnabled && ctx.authConfig.defaultAuthentication.authenticationType !== 'API_KEY') {
        const apiKeyDirArray = [makeDirective(API_KEY_DIRECTIVE, [])];
        extendTypeWithDirectives(ctx, def.name.value, apiKeyDirArray);
        propagateApiKeyToNestedTypes(ctx as TransformerContextProvider, def, new Set<string>());
        queryFields.forEach(operationField => {
          const operationName = operationField.name.value;
          addDirectivesToOperation(ctx, ctx.output.getQueryTypeName()!, operationName, apiKeyDirArray);
        });
        mutationFields.forEach(operationField => {
          const operationName = operationField.name.value;
          addDirectivesToOperation(ctx, ctx.output.getMutationTypeName()!, operationName, apiKeyDirArray);
        });
        subscriptionsFields.forEach(operationField => {
          const operationName = operationField.name.value;
          addDirectivesToOperation(ctx, ctx.output.getSubscriptionTypeName()!, operationName, apiKeyDirArray);
        });
      }
    });
  };

  generateOnCreateResolver = (
    ctx: TransformerContextProvider,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const resolverKey = `OnCreate${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateSubscriptionResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        MappingTemplate.s3MappingTemplateFromString(generateSubscriptionRequestTemplate(), `${typeName}.${fieldName}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(generateSubscriptionResponseTemplate(), `${typeName}.${fieldName}.res.vtl`),
      );
    }
    return this.resolverMap[resolverKey];
  };

  generateOnUpdateResolver = (
    ctx: TransformerContextProvider,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const resolverKey = `OnUpdate${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateSubscriptionResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        MappingTemplate.s3MappingTemplateFromString(generateSubscriptionRequestTemplate(), `${typeName}.${fieldName}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(generateSubscriptionResponseTemplate(), `${typeName}.${fieldName}.res.vtl`),
      );
    }
    return this.resolverMap[resolverKey];
  };

  generateOnDeleteResolver = (
    ctx: TransformerContextProvider,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const resolverKey = `OnDelete${generateResolverKey(typeName, fieldName)}`;
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateSubscriptionResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        MappingTemplate.s3MappingTemplateFromString(generateSubscriptionRequestTemplate(), `${typeName}.${fieldName}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(generateSubscriptionResponseTemplate(), `${typeName}.${fieldName}.res.vtl`),
      );
    }
    return this.resolverMap[resolverKey];
  };

  getQueryFieldNames = (
    type: ObjectTypeDefinitionNode,
  ): Set<{ fieldName: string; typeName: string; type: QueryFieldType; resolverLogicalId: string }> => {
    const typeName = type.name.value;
    const fields: Set<{ fieldName: string; typeName: string; type: QueryFieldType; resolverLogicalId: string }> = new Set();
    const modelDirectiveConfig = this.modelDirectiveConfig.get(type.name.value);
    if (modelDirectiveConfig?.queries?.get) {
      fields.add({
        typeName: 'Query',
        fieldName: modelDirectiveConfig.queries.get || toCamelCase(['get', typeName]),
        type: QueryFieldType.GET,
        resolverLogicalId: ResolverResourceIDs.DynamoDBGetResolverResourceID(typeName),
      });
    }

    if (modelDirectiveConfig?.queries?.list) {
      fields.add({
        typeName: 'Query',
        fieldName: modelDirectiveConfig.queries.list || toCamelCase(['list', typeName]),
        type: QueryFieldType.LIST,
        resolverLogicalId: ResolverResourceIDs.DynamoDBListResolverResourceID(typeName),
      });
    }

    if (modelDirectiveConfig?.queries?.sync) {
      fields.add({
        typeName: 'Query',
        fieldName: modelDirectiveConfig.queries.sync || toCamelCase(['sync', typeName]),
        type: QueryFieldType.SYNC,
        resolverLogicalId: ResolverResourceIDs.SyncResolverResourceID(typeName),
      });
    }

    return fields;
  };

  getMutationFieldNames = (
    type: ObjectTypeDefinitionNode,
  ): Set<{ fieldName: string; typeName: string; type: MutationFieldType; resolverLogicalId: string }> => {
    // Todo: get fields names from the directives
    const typeName = type.name.value;
    const modelDirectiveConfig = this.modelDirectiveConfig.get(typeName);
    const getMutationType = (mutationType: string): MutationFieldType => {
      switch (mutationType) {
        case 'create':
          return MutationFieldType.CREATE;
        case 'update':
          return MutationFieldType.UPDATE;
        case 'delete':
          return MutationFieldType.DELETE;
        default:
          throw new Error('Unknown mutation type');
      }
    };

    const getMutationResolverLogicalId = (mutationType: string): string => {
      switch (mutationType) {
        case 'create':
          return ResolverResourceIDs.DynamoDBCreateResolverResourceID(typeName);
        case 'update':
          return ResolverResourceIDs.DynamoDBUpdateResolverResourceID(typeName);
        case 'delete':
          return ResolverResourceIDs.DynamoDBDeleteResolverResourceID(typeName);
        default:
          throw new Error('Unknown mutation type');
      }
    };

    const fieldNames: Set<{ fieldName: string; typeName: string; type: MutationFieldType; resolverLogicalId: string }> = new Set();
    Object.entries(modelDirectiveConfig?.mutations || {}).forEach(([mutationType, mutationName]) => {
      if (mutationName) {
        fieldNames.add({
          typeName: 'Mutation',
          fieldName: mutationName,
          type: getMutationType(mutationType),
          resolverLogicalId: getMutationResolverLogicalId(mutationType),
        });
      }
    });

    return fieldNames;
  };

  getMutationName = (
    subscriptionType: SubscriptionFieldType,
    mutationMap: Set<{
      fieldName: string;
      typeName: string;
      type: MutationFieldType;
      resolverLogicalId: string;
    }>,
  ): string => {
    const mutationToSubscriptionTypeMap = {
      [SubscriptionFieldType.ON_CREATE]: MutationFieldType.CREATE,
      [SubscriptionFieldType.ON_UPDATE]: MutationFieldType.UPDATE,
      [SubscriptionFieldType.ON_DELETE]: MutationFieldType.DELETE,
    };
    const mutation = Array.from(mutationMap).find(m => m.type === mutationToSubscriptionTypeMap[subscriptionType]);
    if (mutation) {
      return mutation.fieldName;
    }
    throw new Error('Unknown Subscription type');
  };

  protected createQueryFields = (ctx: TransformerValidationStepContextProvider, def: ObjectTypeDefinitionNode): FieldDefinitionNode[] => {
    const queryFields: FieldDefinitionNode[] = [];
    const queryFieldNames = this.getQueryFieldNames(def!);
    queryFieldNames.forEach(queryField => {
      const outputType = this.getOutputType(ctx, def, queryField);
      const args = this.getInputs(ctx, def!, {
        fieldName: queryField.fieldName,
        typeName: queryField.typeName,
        type: queryField.type,
      });
      queryFields.push(makeField(queryField.fieldName, args, makeNamedType(outputType.name.value)));
    });

    return queryFields;
  };

  protected createMutationFields = (ctx: TransformerValidationStepContextProvider, def: ObjectTypeDefinitionNode): FieldDefinitionNode[] => {
    const mutationFields: FieldDefinitionNode[] = [];
    const mutationFieldNames = this.getMutationFieldNames(def!);
    mutationFieldNames.forEach(mutationField => {
      const args = this.getInputs(ctx, def!, {
        fieldName: mutationField.fieldName,
        typeName: mutationField.typeName,
        type: mutationField.type,
      });

      mutationFields.push(makeField(mutationField.fieldName, args, makeNamedType(def!.name.value)));
    });

    return mutationFields;
  };

  protected createSubscriptionFields = (
    ctx: TransformerTransformSchemaStepContextProvider,
    def: ObjectTypeDefinitionNode,
  ): FieldDefinitionNode[] => {
    const subscriptionToMutationsMap = this.getSubscriptionToMutationsReverseMap(def);
    const mutationFields = this.getMutationFieldNames(def!);

    const subscriptionFields: FieldDefinitionNode[] = [];

    Object.keys(subscriptionToMutationsMap).forEach(subscriptionFieldName => {
      const maps = subscriptionToMutationsMap[subscriptionFieldName];

      const args: InputValueDefinitionNode[] = [];
      maps.map(it => args.push(
        ...this.getInputs(ctx, def!, {
          fieldName: it.fieldName,
          typeName: it.typeName,
          type: it.type,
        }),
      ));

      const mutationNames = maps.map(it => this.getMutationName(it.type, mutationFields));

      // Todo use directive wrapper to build the directive node
      const directive = makeDirective('aws_subscribe', [makeArgument('mutations', makeValueNode(mutationNames))]);
      const field = makeField(subscriptionFieldName, args, makeNamedType(def!.name.value), [directive]);
      subscriptionFields.push(field);
    });

    return subscriptionFields;
  };

  getSubscriptionFieldNames = (
    type: ObjectTypeDefinitionNode,
  ): Set<{
    fieldName: string;
    typeName: string;
    type: SubscriptionFieldType;
    resolverLogicalId: string;
  }> => {
    const fields: Set<{
      fieldName: string;
      typeName: string;
      type: SubscriptionFieldType;
      resolverLogicalId: string;
    }> = new Set();

    const modelDirectiveConfig = this.modelDirectiveConfig.get(type.name.value);
    if (modelDirectiveConfig?.subscriptions?.level !== SubscriptionLevel.off) {
      if (modelDirectiveConfig?.subscriptions?.onCreate && modelDirectiveConfig.mutations?.create) {
        modelDirectiveConfig.subscriptions.onCreate.forEach((fieldName: string) => {
          fields.add({
            typeName: 'Subscription',
            fieldName,
            type: SubscriptionFieldType.ON_CREATE,
            resolverLogicalId: ResolverResourceIDs.ResolverResourceID('Subscription', fieldName),
          });
        });
      }

      if (modelDirectiveConfig?.subscriptions?.onUpdate && modelDirectiveConfig.mutations?.update) {
        modelDirectiveConfig.subscriptions.onUpdate.forEach((fieldName: string) => {
          fields.add({
            typeName: 'Subscription',
            fieldName,
            type: SubscriptionFieldType.ON_UPDATE,
            resolverLogicalId: ResolverResourceIDs.ResolverResourceID('Subscription', fieldName),
          });
        });
      }

      if (modelDirectiveConfig?.subscriptions?.onDelete && modelDirectiveConfig.mutations?.delete) {
        modelDirectiveConfig.subscriptions.onDelete.forEach((fieldName: string) => {
          fields.add({
            typeName: 'Subscription',
            fieldName,
            type: SubscriptionFieldType.ON_DELETE,
            resolverLogicalId: ResolverResourceIDs.ResolverResourceID('Subscription', fieldName),
          });
        });
      }
    }

    return fields;
  };

  // Todo: add sanity check to ensure the type has an table
  getDataSourceResource = (type: ObjectTypeDefinitionNode): DataSourceInstance => this.dataSourceInstanceMap[type.name.value];

  getDataSourceType = (): AppSyncDataSourceType => AppSyncDataSourceType.NONE;

  getInputs = (
    ctx: TransformerTransformSchemaStepContextProvider,
    type: ObjectTypeDefinitionNode,
    operation: {
      fieldName: string;
      typeName: string;
      type: QueryFieldType | MutationFieldType | SubscriptionFieldType;
    },
  ): InputValueDefinitionNode[] => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();

    const knownModels = this.typesWithModelDirective;
    let conditionInput: InputObjectTypeDefinitionNode;
    if ([MutationFieldType.CREATE, MutationFieldType.DELETE, MutationFieldType.UPDATE].includes(operation.type as MutationFieldType)) {
      const conditionTypeName = toPascalCase(['Model', type.name.value, 'ConditionInput']);

      const filterInputs = createEnumModelFilters(ctx, type);
      conditionInput = makeMutationConditionInput(ctx, conditionTypeName, type);
      filterInputs.push(conditionInput);
      filterInputs.forEach(input => {
        const conditionInputName = input.name.value;
        if (!ctx.output.getType(conditionInputName)) {
          ctx.output.addInput(input);
        }
      });
    }
    switch (operation.type) {
      case QueryFieldType.GET:
        return [makeInputValueDefinition('id', makeNonNullType(makeNamedType('ID')))];

      case QueryFieldType.LIST: {
        const filterInputName = toPascalCase(['Model', type.name.value, 'FilterInput']);
        const filterInputs = createEnumModelFilters(ctx, type);
        filterInputs.push(makeListQueryFilterInput(ctx, filterInputName, type));
        filterInputs.forEach(input => {
          const conditionInputName = input.name.value;
          if (!ctx.output.getType(conditionInputName)) {
            ctx.output.addInput(input);
          }
        });

        return [
          makeInputValueDefinition('filter', makeNamedType(filterInputName)),
          makeInputValueDefinition('limit', makeNamedType('Int')),
          makeInputValueDefinition('nextToken', makeNamedType('String')),
        ];
      }
      case QueryFieldType.SYNC: {
        const syncFilterInputName = toPascalCase(['Model', type.name.value, 'FilterInput']);
        const syncFilterInputs = makeListQueryFilterInput(ctx, syncFilterInputName, type);
        const conditionInputName = syncFilterInputs.name.value;
        if (!ctx.output.getType(conditionInputName)) {
          ctx.output.addInput(syncFilterInputs);
        }
        return [
          makeInputValueDefinition('filter', makeNamedType(syncFilterInputName)),
          makeInputValueDefinition('limit', makeNamedType('Int')),
          makeInputValueDefinition('nextToken', makeNamedType('String')),
          makeInputValueDefinition('lastSync', makeNamedType('AWSTimestamp')),
        ];
      }
      case MutationFieldType.CREATE: {
        const createInputField = makeCreateInputField(
          type,
          this.modelDirectiveConfig.get(type.name.value)!,
          knownModels,
          ctx.inputDocument,
          isSyncEnabled,
        );
        const createInputTypeName = createInputField.name.value;
        if (!ctx.output.getType(createInputField.name.value)) {
          ctx.output.addInput(createInputField);
        }
        return [
          makeInputValueDefinition('input', makeNonNullType(makeNamedType(createInputTypeName))),
          makeInputValueDefinition('condition', makeNamedType(conditionInput!.name.value)),
        ];
      }
      case MutationFieldType.DELETE: {
        const deleteInputField = makeDeleteInputField(type, isSyncEnabled);
        const deleteInputTypeName = deleteInputField.name.value;
        if (!ctx.output.getType(deleteInputField.name.value)) {
          ctx.output.addInput(deleteInputField);
        }
        return [
          makeInputValueDefinition('input', makeNonNullType(makeNamedType(deleteInputTypeName))),
          makeInputValueDefinition('condition', makeNamedType(conditionInput!.name.value)),
        ];
      }
      case MutationFieldType.UPDATE: {
        const updateInputField = makeUpdateInputField(
          type,
          this.modelDirectiveConfig.get(type.name.value)!,
          knownModels,
          ctx.inputDocument,
          isSyncEnabled,
        );
        const updateInputTypeName = updateInputField.name.value;
        if (!ctx.output.getType(updateInputField.name.value)) {
          ctx.output.addInput(updateInputField);
        }
        return [
          makeInputValueDefinition('input', makeNonNullType(makeNamedType(updateInputTypeName))),
          makeInputValueDefinition('condition', makeNamedType(conditionInput!.name.value)),
        ];
      }
      case SubscriptionFieldType.ON_CREATE:
      case SubscriptionFieldType.ON_DELETE:
      case SubscriptionFieldType.ON_UPDATE:
        const filterInputName = toPascalCase(['ModelSubscription', type.name.value, 'FilterInput']);
        const filterInputs = createEnumModelFilters(ctx, type);
        filterInputs.push(makeSubscriptionQueryFilterInput(ctx, filterInputName, type));
        filterInputs.forEach(input => {
          const conditionInputName = input.name.value;
          if (!ctx.output.getType(conditionInputName)) {
            ctx.output.addInput(input);
          }
        });

        return [
          makeInputValueDefinition('filter', makeNamedType(filterInputName)),
        ];

      default:
        throw new Error('Unknown operation type');
    }
  };

  getOutputType = (
    ctx: TransformerTransformSchemaStepContextProvider,
    type: ObjectTypeDefinitionNode,
    operation: {
      fieldName: string;
      typeName: string;
      type: QueryFieldType | MutationFieldType | SubscriptionFieldType;
    },
  ): ObjectTypeDefinitionNode => {
    let outputType: ObjectTypeDefinitionNode;
    switch (operation.type) {
      case MutationFieldType.CREATE:
      case MutationFieldType.UPDATE:
      case MutationFieldType.DELETE:
      case QueryFieldType.GET:
      case SubscriptionFieldType.ON_CREATE:
      case SubscriptionFieldType.ON_DELETE:
      case SubscriptionFieldType.ON_UPDATE:
        outputType = type;
        break;
      case QueryFieldType.SYNC:
      case QueryFieldType.LIST: {
        const isSyncEnabled = ctx.isProjectUsingDataStore();
        const connectionFieldName = toPascalCase(['Model', type.name.value, 'Connection']);
        outputType = makeListQueryModel(type, connectionFieldName, isSyncEnabled);
        break;
      }
      default:
        throw new Error(`${operation.type} not supported for ${type.name.value}`);
    }
    if (!ctx.output.getObject(outputType.name.value)) {
      ctx.output.addObject(outputType);
    }
    return outputType;
  };

  protected createNonModelInputs = (ctx: TransformerTransformSchemaStepContextProvider, obj: ObjectTypeDefinitionNode): void => {
    (obj.fields ?? []).forEach(field => {
      if (!isScalar(field.type)) {
        const def = ctx.output.getType(getBaseType(field.type));
        if (def && def.kind === 'ObjectTypeDefinition' && !this.isModelField(def.name.value)) {
          const name = this.getNonModelInputObjectName(def.name.value);
          if (!ctx.output.getType(name)) {
            const inputObj = InputObjectDefinitionWrapper.fromObject(name, def, ctx.inputDocument);
            ctx.output.addInput(inputObj.serialize());
            this.createNonModelInputs(ctx, def);
          }
        }
      }
    });
  };

  protected isModelField = (name: string): boolean => (!!this.typesWithModelDirective.has(name));

  protected getNonModelInputObjectName = (name: string): string => `${name}Input`;

  /**
   * Model directive automatically adds id, created and updated time stamps to the filed, if they are configured
   * @param ctx transform context
   * @param name Name of the type
   */
  protected addAutoGeneratableFields = (ctx: TransformerTransformSchemaStepContextProvider, name: string): void => {
    const modelDirectiveConfig = this.modelDirectiveConfig.get(name);
    const typeObj = ctx.output.getObject(name);
    if (!typeObj) {
      throw new Error(`Type ${name} is missing in outputs`);
    }
    const typeWrapper = new ObjectDefinitionWrapper(typeObj);
    if (!typeWrapper.hasField('id')) {
      const idField = FieldWrapper.create('id', 'ID');
      typeWrapper.addField(idField);
    }

    const timestamps = [];

    if (modelDirectiveConfig?.timestamps) {
      if (modelDirectiveConfig.timestamps.createdAt !== null) {
        timestamps.push(modelDirectiveConfig.timestamps.createdAt ?? 'createdAt');
      }

      if (modelDirectiveConfig.timestamps.updatedAt !== null) {
        timestamps.push(modelDirectiveConfig.timestamps.updatedAt ?? 'updatedAt');
      }
    }

    timestamps.forEach(fieldName => {
      if (typeWrapper.hasField(fieldName)) {
        const field = typeWrapper.getField(fieldName);
        if (!['String', 'AWSDateTime'].includes(field.getTypeName())) {
          console.warn(`type ${name}.${fieldName} is not of String or AWSDateTime. Auto population is not supported`);
        }
      } else {
        const field = FieldWrapper.create(fieldName, 'AWSDateTime');
        typeWrapper.addField(field);
      }
    });

    ctx.output.updateObject(typeWrapper.serialize());
  };

  protected addModelSyncFields = (ctx: TransformerTransformSchemaStepContextProvider, name: string): void => {
    const typeObj = ctx.output.getObject(name);
    if (!typeObj) {
      throw new Error(`Type ${name} is missing in outputs`);
    }

    const typeWrapper = new ObjectDefinitionWrapper(typeObj);
    typeWrapper.addField(FieldWrapper.create('_version', 'Int'));
    typeWrapper.addField(FieldWrapper.create('_deleted', 'Boolean', true));
    typeWrapper.addField(FieldWrapper.create('_lastChangedAt', 'AWSTimestamp'));

    ctx.output.updateObject(typeWrapper.serialize());
  };

  protected getSubscriptionToMutationsReverseMap = (
    def: ObjectTypeDefinitionNode,
  ): { [subField: string]: { fieldName: string; typeName: string; type: SubscriptionFieldType }[] } => {
    const subscriptionToMutationsMap: { [subField: string]: { fieldName: string; typeName: string; type: SubscriptionFieldType }[] } = {};
    const subscriptionFieldNames = this.getSubscriptionFieldNames(def);

    subscriptionFieldNames.forEach((subscriptionFieldName) => {
      if (!subscriptionToMutationsMap[subscriptionFieldName.fieldName]) {
        subscriptionToMutationsMap[subscriptionFieldName.fieldName] = [];
      }
      subscriptionToMutationsMap[subscriptionFieldName.fieldName].push(subscriptionFieldName);
    });

    return subscriptionToMutationsMap;
  };

  ensureModelSortDirectionEnum = (ctx: TransformerValidationStepContextProvider): void => {
    if (!ctx.output.hasType('ModelSortDirection')) {
      const modelSortDirection = makeModelSortDirectionEnumObject();

      ctx.output.addEnum(modelSortDirection);
    }
  }

  protected getOptions = (options: ModelTransformerOptions): ModelTransformerOptions => ({
    EnableDeletionProtection: false,
    ...options,
  });
}
