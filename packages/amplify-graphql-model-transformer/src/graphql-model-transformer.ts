import {
  DDB_DB_TYPE,
  MYSQL_DB_TYPE,
  DirectiveWrapper,
  FieldWrapper,
  generateGetArgumentsInput,
  getFieldNameFor,
  InputObjectDefinitionWrapper,
  InvalidDirectiveError,
  ObjectDefinitionWrapper,
  SyncUtils,
  TransformerModelBase,
  DatasourceType,
} from '@aws-amplify/graphql-transformer-core';
import {
  AppSyncDataSourceType,
  DataSourceInstance,
  DataSourceProvider,
  MutationFieldType,
  QueryFieldType,
  SubscriptionFieldType,
  TransformerBeforeStepContextProvider,
  TransformerContextProvider,
  TransformerModelProvider,
  TransformerPrepareStepContextProvider,
  TransformerResolverProvider,
  TransformerSchemaVisitStepContextProvider,
  TransformerTransformSchemaStepContextProvider,
  TransformerValidationStepContextProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  ITable,
  StreamViewType,
  Table,
  TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import {
  DirectiveNode,
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
  toPascalCase,
  toUpper,
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
import { API_KEY_DIRECTIVE } from './definitions';
import { ModelDirectiveConfiguration, SubscriptionLevel } from './directive';
import { ModelResourceGenerator } from './resources/model-resource-generator';
import { DynamoModelResourceGenerator } from './resources/dynamo-model-resource-generator';
import { RdsModelResourceGenerator } from './resources/rds-model-resource-generator';
import { ModelTransformerOptions } from './types';

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

const DDB_DATASOURCE_TYPE = { dbType: DDB_DB_TYPE, provisioned: true };

/**
 * ModelTransformer
 */
export class ModelTransformer extends TransformerModelBase implements TransformerModelProvider {
  private options: ModelTransformerOptions;
  private datasourceMap: Record<string, DataSourceProvider> = {};
  private ddbTableMap: Record<string, ITable> = {};
  private resolverMap: Record<string, TransformerResolverProvider> = {};
  private typesWithModelDirective: Set<string> = new Set();
  private resourceGeneratorMap: Map<string, ModelResourceGenerator> = new Map<string, ModelResourceGenerator>();
  private modelToDatasourceMap: Map<string, DatasourceType> = new Map<string, DatasourceType>()
  /**
   * A Map to hold the directive configuration
   */
  private modelDirectiveConfig: Map<string, ModelDirectiveConfiguration> = new Map();
  constructor(options: ModelTransformerOptions = {}) {
    super('amplify-model-transformer', directiveDefinition);
    this.options = this.getOptions(options);
    const rdsGenerator = new RdsModelResourceGenerator();
    this.resourceGeneratorMap.set(DDB_DB_TYPE, new DynamoModelResourceGenerator());
    this.resourceGeneratorMap.set(MYSQL_DB_TYPE, rdsGenerator);
  }

  before = (ctx: TransformerBeforeStepContextProvider): void => {
    const datasourceMapValues: Array<DatasourceType> = Array.from(ctx.modelToDatasourceMap.values());
    if (datasourceMapValues.some((value) => value.dbType === DDB_DB_TYPE && value.provisionDB)) {
      this.resourceGeneratorMap.get(DDB_DB_TYPE)?.enableGenerator();
      this.resourceGeneratorMap.get(DDB_DB_TYPE)?.enableProvisioned();
    }
    if (datasourceMapValues.some((value) => value.dbType === MYSQL_DB_TYPE && !value.provisionDB)) {
      this.resourceGeneratorMap.get(MYSQL_DB_TYPE)?.enableGenerator();
      this.resourceGeneratorMap.get(MYSQL_DB_TYPE)?.enableUnprovisioned();
    }
    if (datasourceMapValues.length === 0) {
      // Just enable DynamoDB provisioned, legacy use
      this.resourceGeneratorMap.get(DDB_DB_TYPE)?.enableGenerator();
      this.resourceGeneratorMap.get(DDB_DB_TYPE)?.enableProvisioned();
    }
    // We only store this in the model because some of the required override methods need to pass through to the
    // Resource generators, but do not have access to the context
    this.modelToDatasourceMap = ctx.modelToDatasourceMap;
  };

  object = (definition: ObjectTypeDefinitionNode, directive: DirectiveNode, ctx: TransformerSchemaVisitStepContextProvider): void => {
    const isTypeNameReserved = definition.name.value === ctx.output.getQueryTypeName()
      || definition.name.value === ctx.output.getMutationTypeName()
      || definition.name.value === ctx.output.getSubscriptionTypeName();

    const isDynamoDB = (ctx.modelToDatasourceMap.get(definition.name.value) ?? DDB_DATASOURCE_TYPE).dbType === DDB_DB_TYPE;
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
      timestamps: isDynamoDB ? {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      } : {
        createdAt: undefined,
        updatedAt: undefined,
      },
    }, generateGetArgumentsInput(ctx.transformParameters));

    // This property override is specifically to address parity between V1 and V2 when the FF is disabled
    // If one subscription is defined, just let the others go to null without FF. But if public and none defined, default all subs
    if (!ctx.transformParameters.shouldDeepMergeDirectiveConfigDefaults) {
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
        generateGetArgumentsInput(ctx.transformParameters),
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

    const dataType = ctx.modelToDatasourceMap.get(typeName) ?? DDB_DATASOURCE_TYPE;
    const resourceGenerator = this.resourceGeneratorMap.get(dataType.dbType);
    if (resourceGenerator) {
      resourceGenerator.addModelDefinition(definition, options);
    } else {
      throw Error(`DB Type or Resource Generator not defined for ${typeName}`);
    }
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

      if ((ctx.modelToDatasourceMap.get(def.name.value) ?? DDB_DATASOURCE_TYPE).dbType === DDB_DB_TYPE) {
        // Update the field with auto generatable Fields
        this.addAutoGeneratableFields(ctx, type);

        if (ctx.isProjectUsingDataStore()) {
          this.addModelSyncFields(ctx, type);
        }
      }
      // global auth check
      if (!hasAuth && ctx.transformParameters.sandboxModeEnabled && ctx.authConfig.defaultAuthentication.authenticationType !== 'API_KEY') {
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

  generateResolvers = (context: TransformerContextProvider): void => {
    this.resourceGeneratorMap.forEach((generator) => {
      generator.generateResources(context);
    });
  };

  generateGetResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const dbInfo = ctx.modelToDatasourceMap.get(type.name.value) ?? DDB_DATASOURCE_TYPE;
    if (dbInfo?.dbType && this.resourceGeneratorMap.has(dbInfo.dbType)) {
      // Coercing this into being defined as we're running a check on it first
      return this.resourceGeneratorMap.get(dbInfo.dbType)!.generateGetResolver(ctx, type, typeName, fieldName, resolverLogicalId);
    }
    throw new Error(`DB Type undefined or resource generator not provided for ${type.name.value}`);
  };

  generateListResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const dbInfo = ctx.modelToDatasourceMap.get(type.name.value) ?? DDB_DATASOURCE_TYPE;
    if (dbInfo?.dbType && this.resourceGeneratorMap.has(dbInfo.dbType)) {
      // Coercing this into being defined as we're running a check on it first
      return this.resourceGeneratorMap.get(dbInfo.dbType)!.generateListResolver(ctx, type, typeName, fieldName, resolverLogicalId);
    }
    throw new Error(`DB Type undefined or resource generator not provided for ${type.name.value}`);
  };

  generateCreateResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const dbInfo = ctx.modelToDatasourceMap.get(type.name.value) ?? DDB_DATASOURCE_TYPE;
    if (dbInfo?.dbType && this.resourceGeneratorMap.has(dbInfo.dbType)) {
      // Coercing this into being defined as we're running a check on it first
      return this.resourceGeneratorMap.get(dbInfo.dbType)!.generateCreateResolver(ctx, type, typeName, fieldName, resolverLogicalId);
    }
    throw new Error(`DB Type undefined or resource generator not provided for ${type.name.value}`);
  };

  generateUpdateResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const modelDirectiveConfig = this.modelDirectiveConfig.get(type.name.value)!;
    const dbInfo = ctx.modelToDatasourceMap.get(type.name.value) ?? DDB_DATASOURCE_TYPE;
    if (dbInfo?.dbType && this.resourceGeneratorMap.has(dbInfo.dbType)) {
      // Coercing this into being defined as we're running a check on it first
      return this.resourceGeneratorMap.get(dbInfo.dbType)!.generateUpdateResolver(
        ctx,
        type,
        modelDirectiveConfig,
        typeName,
        fieldName,
        resolverLogicalId,
      );
    }
    throw new Error(`DB Type undefined or resource generator not provided for ${type.name.value}`);
  };

  generateDeleteResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const dbInfo = ctx.modelToDatasourceMap.get(type.name.value) ?? DDB_DATASOURCE_TYPE;
    if (dbInfo?.dbType && this.resourceGeneratorMap.has(dbInfo.dbType)) {
      // Coercing this into being defined as we're running a check on it first
      return this.resourceGeneratorMap.get(dbInfo.dbType)!.generateDeleteResolver(ctx, type, typeName, fieldName, resolverLogicalId);
    }
    throw new Error(`DB Type undefined or resource generator not provided for ${type.name.value}`);
  };

  generateOnCreateResolver = (
    ctx: TransformerContextProvider,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    if (this.resourceGeneratorMap.has(DDB_DB_TYPE)) {
      // Coercing this into being defined as we're running a check on it first
      return this.resourceGeneratorMap.get(DDB_DB_TYPE)!.generateOnCreateResolver(ctx, typeName, fieldName, resolverLogicalId);
    }
    throw new Error('Resource generator not provided for DDB');
  };

  generateOnUpdateResolver = (
    ctx: TransformerContextProvider,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    if (this.resourceGeneratorMap.has(DDB_DB_TYPE)) {
      // Coercing this into being defined as we're running a check on it first
      return this.resourceGeneratorMap.get(DDB_DB_TYPE)!.generateOnUpdateResolver(ctx, typeName, fieldName, resolverLogicalId);
    }
    throw new Error('Resource generator not provided for DDB');
  };

  generateOnDeleteResolver = (
    ctx: TransformerContextProvider,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    if (this.resourceGeneratorMap.has(DDB_DB_TYPE)) {
      // Coercing this into being defined as we're running a check on it first
      return this.resourceGeneratorMap.get(DDB_DB_TYPE)!.generateOnDeleteResolver(ctx, typeName, fieldName, resolverLogicalId);
    }
    throw new Error('Resource generator not provided for DDB');
  };

  generateSyncResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const dbInfo = ctx.modelToDatasourceMap.get(type.name.value) ?? DDB_DATASOURCE_TYPE;
    if (dbInfo?.dbType && this.resourceGeneratorMap.has(dbInfo.dbType)) {
      // Coercing this into being defined as we're running a check on it first
      return this.resourceGeneratorMap.get(dbInfo.dbType)!.generateSyncResolver(ctx, type, typeName, fieldName, resolverLogicalId);
    }
    throw new Error(`DB Type undefined or resource generator not provided for ${type.name.value}`);
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

  private createQueryFields = (ctx: TransformerValidationStepContextProvider, def: ObjectTypeDefinitionNode): FieldDefinitionNode[] => {
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

  private createMutationFields = (ctx: TransformerValidationStepContextProvider, def: ObjectTypeDefinitionNode): FieldDefinitionNode[] => {
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

  private createSubscriptionFields = (
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

  getQueryFieldNames = (
    type: ObjectTypeDefinitionNode,
  ): Set<{ fieldName: string; typeName: string; type: QueryFieldType; resolverLogicalId: string }> => {
    const dbType = (this.modelToDatasourceMap.get(type.name.value) ?? DDB_DATASOURCE_TYPE)?.dbType;
    const resourceGenerator = dbType ? this.resourceGeneratorMap.get(dbType) : null;
    if (resourceGenerator) {
      return resourceGenerator.getQueryFieldNames(type);
    }
    throw new Error(`Resource Generator or DB Type not defined for ${type.name.value}`);
  };

  getMutationFieldNames = (
    type: ObjectTypeDefinitionNode,
  ): Set<{ fieldName: string; typeName: string; type: MutationFieldType; resolverLogicalId: string }> => {
    const dbType = (this.modelToDatasourceMap.get(type.name.value) ?? DDB_DATASOURCE_TYPE)?.dbType;
    const resourceGenerator = dbType ? this.resourceGeneratorMap.get(dbType) : null;
    if (resourceGenerator) {
      return resourceGenerator.getMutationFieldNames(type);
    }
    throw new Error(`Resource Generator or DB Type not defined for ${type.name.value}`);
  };

  getSubscriptionFieldNames = (
    type: ObjectTypeDefinitionNode,
  ): Set<{
    fieldName: string;
    typeName: string;
    type: SubscriptionFieldType;
    resolverLogicalId: string;
  }> => {
    const dbType = (this.modelToDatasourceMap.get(type.name.value) ?? DDB_DATASOURCE_TYPE)?.dbType;
    const resourceGenerator = dbType ? this.resourceGeneratorMap.get(dbType) : null;
    if (resourceGenerator) {
      return resourceGenerator.getSubscriptionFieldNames(type);
    }
    throw new Error(`Resource Generator or DB Type not defined for ${type.name.value}`);
  };

  // Todo: add sanity check to ensure the type has an table
  getDataSourceResource = (type: ObjectTypeDefinitionNode): DataSourceInstance => this.ddbTableMap[type.name.value];

  getDataSourceType = (): AppSyncDataSourceType => AppSyncDataSourceType.AMAZON_DYNAMODB;

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

  /**
   * createIAMRole
   */
  createIAMRole = (context: TransformerContextProvider, def: ObjectTypeDefinitionNode, stack: cdk.Stack, tableName: string): iam.Role => {
    const ddbGenerator = this.resourceGeneratorMap.get(DDB_DB_TYPE) as DynamoModelResourceGenerator;
    return ddbGenerator.createIAMRole(context, def, stack, tableName);
  }

  private createNonModelInputs = (ctx: TransformerTransformSchemaStepContextProvider, obj: ObjectTypeDefinitionNode): void => {
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

  private isModelField = (name: string): boolean => (!!this.typesWithModelDirective.has(name));

  private getNonModelInputObjectName = (name: string): string => `${toUpper(name)}Input`;

  /**
   * Model directive automatically adds id, created and updated time stamps to the filed, if they are configured
   * @param ctx transform context
   * @param name Name of the type
   */
  private addAutoGeneratableFields = (ctx: TransformerTransformSchemaStepContextProvider, name: string): void => {
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

  private addModelSyncFields = (ctx: TransformerTransformSchemaStepContextProvider, name: string): void => {
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

  private getSubscriptionToMutationsReverseMap = (
    def: ObjectTypeDefinitionNode,
  ): { [subField: string]: { fieldName: string; typeName: string; type: SubscriptionFieldType }[] } => {
    const subscriptionToMutationsMap: { [subField: string]: { fieldName: string; typeName: string; type: SubscriptionFieldType }[] } = {};
    const subscriptionFieldNames = this.getSubscriptionFieldNames(def);

    subscriptionFieldNames.forEach(subscriptionFieldName => {
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

  private getOptions = (options: ModelTransformerOptions): ModelTransformerOptions => ({
    EnableDeletionProtection: false,
    ...options,
  });
}
