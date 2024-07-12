import {
  DataSourceProvider,
  MutationFieldType,
  QueryFieldType,
  SubscriptionFieldType,
  TransformerContextProvider,
  TransformerResolverProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { ObjectTypeDefinitionNode } from 'graphql';
import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { ResolverResourceIDs, toCamelCase } from 'graphql-transformer-common';
import { generatePostAuthExpression, generateResolverKey, ModelVTLGenerator } from '../resolvers';
import { ModelDirectiveConfiguration, SubscriptionLevel } from '../directive';
import { ModelTransformerOptions } from '../types';

/**
 * Abstract class definition for ModelResourceGenerator
 * ModelResourceGenerator implementations are intended to create resources for the model transformer plugin
 * according to the data source that backs the model
 */
export abstract class ModelResourceGenerator {
  protected datasourceMap: Record<string, DataSourceProvider> = {};

  private resolverMap: Record<string, TransformerResolverProvider> = {};

  protected generatorType = 'ModelResourceGenerator';

  private enabled = false;

  private provisioned = false;

  private unprovisioned = false;

  protected models: Array<ObjectTypeDefinitionNode> = new Array<ObjectTypeDefinitionNode>();

  protected modelDirectiveMap: Map<string, ModelDirectiveConfiguration> = new Map<string, ModelDirectiveConfiguration>();

  protected options: ModelTransformerOptions;

  constructor(options: ModelTransformerOptions = {}) {
    this.options = options;
  }

  /**
   * Returns the defined name for the generator
   * @returns generatorType of the generator
   */
  getGeneratorType(): string {
    return this.generatorType;
  }

  protected isEnabled(): boolean {
    return this.enabled;
  }

  protected isProvisioned(): boolean {
    return this.provisioned;
  }

  protected isUnprovisioned(): boolean {
    return this.unprovisioned;
  }

  /**
   * Used to enable this generator for resources. If the method is not called, no resources will be generated.
   * This is done to prevent the generator from creating DynamoDB resources or related resources if they are unused
   */
  enableGenerator(): void {
    this.enabled = true;
  }

  /**
   * Used to enable generation of resources for provisioned datasources. In this case, provisioned means that
   * the transformer is responsible for creating the datasource.
   */
  enableProvisioned(): void {
    this.provisioned = true;
  }

  /**
   * Used to enable generation of resources for unprovisioned datasources. In this case, unprovisioned means that
   * the transformer is not responsible for creating the datasource.
   */
  enableUnprovisioned(): void {
    this.unprovisioned = true;
  }

  /**
   * Add a model type definition to the array of models the particular implementation of the resource generator is
   * responsible for creating
   * @param def Model type definition
   * @param config ModelDirectiveConfiguration for the particular type definition
   */
  addModelDefinition(def: ObjectTypeDefinitionNode, config: ModelDirectiveConfiguration): void {
    this.models.push(def);
    this.modelDirectiveMap.set(def.name.value, config);
  }

  /**
   * Generates all necessary resources for the type of datasource associated with the implementation of the resource generator
   * @param scope CDK Construct usable as a scope for creating resources
   * @param ctx TransformerContextProvider for providing transformer context information during resource generation
   */
  abstract generateResources(ctx: TransformerContextProvider): void;

  abstract getVTLGenerator(): ModelVTLGenerator;

  protected generateResolvers(context: TransformerContextProvider): void {
    this.models.forEach((def) => {
      const queryFields = this.getQueryFieldNames(def);
      queryFields.forEach((query) => {
        let resolver;
        switch (query.type) {
          case QueryFieldType.GET:
            resolver = this.generateGetResolver(context, def, query.typeName, query.fieldName, query.resolverLogicalId);
            break;
          case QueryFieldType.LIST:
            resolver = this.generateListResolver(context, def, query.typeName, query.fieldName, query.resolverLogicalId);
            break;
          case QueryFieldType.SYNC:
            resolver = this.generateSyncResolver(context, def, query.typeName, query.fieldName, query.resolverLogicalId);
            break;
          default:
            throw new Error('Unknown query field type');
        }
        // TODO: add mechanism to add an auth like rule to all non auth @models
        // this way we can just depend on auth to add the check
        resolver.addVtlFunctionToSlot(
          'postAuth',
          MappingTemplate.s3MappingTemplateFromString(
            generatePostAuthExpression(context.transformParameters.sandboxModeEnabled, context.synthParameters.enableIamAccess),
            `${query.typeName}.${query.fieldName}.{slotName}.{slotIndex}.req.vtl`,
          ),
        );
        resolver.setScope(context.stackManager.getScopeFor(query.resolverLogicalId, def!.name.value));
        context.resolvers.addResolver(query.typeName, query.fieldName, resolver);
      });

      const mutationFields = this.getMutationFieldNames(def!);
      mutationFields.forEach((mutation) => {
        let resolver;
        switch (mutation.type) {
          case MutationFieldType.CREATE:
            resolver = this.generateCreateResolver(context, def!, mutation.typeName, mutation.fieldName, mutation.resolverLogicalId);
            break;
          case MutationFieldType.DELETE:
            resolver = this.generateDeleteResolver(context, def!, mutation.typeName, mutation.fieldName, mutation.resolverLogicalId);
            break;
          case MutationFieldType.UPDATE:
            resolver = this.generateUpdateResolver(
              context,
              def!,
              this.modelDirectiveMap.get(def.name.value)!,
              mutation.typeName,
              mutation.fieldName,
              mutation.resolverLogicalId,
            );
            break;
          default:
            throw new Error('Unknown mutation field type');
        }
        resolver.addVtlFunctionToSlot(
          'postAuth',
          MappingTemplate.s3MappingTemplateFromString(
            generatePostAuthExpression(context.transformParameters.sandboxModeEnabled, context.synthParameters.enableIamAccess),
            `${mutation.typeName}.${mutation.fieldName}.{slotName}.{slotIndex}.req.vtl`,
          ),
        );
        resolver.setScope(context.stackManager.getScopeFor(mutation.resolverLogicalId, def!.name.value));
        context.resolvers.addResolver(mutation.typeName, mutation.fieldName, resolver);
      });

      const subscriptionLevel = this.modelDirectiveMap.get(def.name.value)?.subscriptions?.level ?? SubscriptionLevel.on;
      // in order to create subscription resolvers the level needs to be on
      if (subscriptionLevel !== SubscriptionLevel.off) {
        const subscriptionFields = this.getSubscriptionFieldNames(def!);
        subscriptionFields.forEach((subscription) => {
          let resolver;
          switch (subscription.type) {
            case SubscriptionFieldType.ON_CREATE:
              resolver = this.generateOnCreateResolver(
                context,
                subscription.typeName,
                subscription.fieldName,
                subscription.resolverLogicalId,
              );
              break;
            case SubscriptionFieldType.ON_UPDATE:
              resolver = this.generateOnUpdateResolver(
                context,
                subscription.typeName,
                subscription.fieldName,
                subscription.resolverLogicalId,
              );
              break;
            case SubscriptionFieldType.ON_DELETE:
              resolver = this.generateOnDeleteResolver(
                context,
                subscription.typeName,
                subscription.fieldName,
                subscription.resolverLogicalId,
              );
              break;
            default:
              throw new Error('Unknown subscription field type');
          }
          if (subscriptionLevel === SubscriptionLevel.on) {
            resolver.addVtlFunctionToSlot(
              'postAuth',
              MappingTemplate.s3MappingTemplateFromString(
                generatePostAuthExpression(context.transformParameters.sandboxModeEnabled, context.synthParameters.enableIamAccess),
                `${subscription.typeName}.${subscription.fieldName}.{slotName}.{slotIndex}.req.vtl`,
              ),
            );
          }
          resolver.setScope(context.stackManager.getScopeFor(subscription.resolverLogicalId, def!.name.value));
          context.resolvers.addResolver(subscription.typeName, subscription.fieldName, resolver);
        });
      }
    });
  }

  generateGetResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `Get${generateResolverKey(typeName, fieldName)}`;
    const vtlGenerator = this.getVTLGenerator();
    const modelIndexFields = type
      .fields!.filter((field) => field.directives?.some((it) => it.name.value === 'index'))
      .map((it) => it.name.value);
    const requestConfig = {
      operation: 'GET',
      operationName: fieldName,
      modelName: type.name.value,
    };
    const responseConfig = {
      ...requestConfig,
      isSyncEnabled,
      modelName: type.name.value,
      modelIndexFields,
    };
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateQueryResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateGetRequestTemplate(requestConfig, ctx),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateGetResponseTemplate(responseConfig),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
    }
    return this.resolverMap[resolverKey];
  };

  generateListResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `List${generateResolverKey(typeName, fieldName)}`;
    const vtlGenerator = this.getVTLGenerator();
    const requestConfig = {
      operation: 'LIST',
      operationName: fieldName,
      modelName: type.name.value,
    };
    const responseConfig = {
      ...requestConfig,
      isSyncEnabled,
      mutation: false,
    };
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateQueryResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateListRequestTemplate(requestConfig, ctx),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateDefaultResponseMappingTemplate(responseConfig),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
    }
    return this.resolverMap[resolverKey];
  };

  generateCreateResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `Create${generateResolverKey(typeName, fieldName)}`;
    const vtlGenerator = this.getVTLGenerator();
    const modelIndexFields = type
      .fields!.filter((field) => field.directives?.some((it) => it.name.value === 'index'))
      .map((it) => it.name.value);
    const requestConfig = {
      operation: 'CREATE',
      operationName: fieldName,
      modelIndexFields,
      modelName: type.name.value,
    };
    const responseConfig = {
      operation: 'CREATE',
      operationName: fieldName,
      isSyncEnabled,
      mutation: true,
      modelName: type.name.value,
    };
    if (!this.resolverMap[resolverKey]) {
      const resolver = ctx.resolvers.generateMutationResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateCreateRequestTemplate(requestConfig, ctx),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateDefaultResponseMappingTemplate(responseConfig),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
      this.resolverMap[resolverKey] = resolver;
      const initSlotConfig = {
        operation: 'CREATE',
        operationName: fieldName,
        modelConfig: this.modelDirectiveMap.get(type.name.value)!,
      };

      // check for implicit id field
      const outputType = ctx.output.getObject(type.name.value);
      const initializeIdField = !!outputType?.fields!.find(
        (field) =>
          field.name.value === 'id' &&
          ((field.type.kind === 'NonNullType' &&
            field.type.type.kind === 'NamedType' &&
            (field.type.type.name.value === 'ID' || field.type.type.name.value === 'String')) ||
            (field.type.kind === 'NamedType' && (field.type.name.value === 'ID' || field.type.name.value === 'String'))),
      );

      resolver.addVtlFunctionToSlot(
        'init',
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateCreateInitSlotTemplate(initSlotConfig, initializeIdField),
          `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`,
        ),
      );
    }
    return this.resolverMap[resolverKey];
  };

  generateUpdateResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    modelConfig: ModelDirectiveConfiguration,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `Update${generateResolverKey(typeName, fieldName)}`;
    const vtlGenerator = this.getVTLGenerator();
    const modelIndexFields = type
      .fields!.filter((field) => field.directives?.some((it) => it.name.value === 'index'))
      .map((it) => it.name.value);
    const requestConfig = {
      operation: 'UPDATE',
      operationName: fieldName,
      isSyncEnabled,
      modelName: type.name.value,
      modelIndexFields,
    };
    const responseConfig = {
      operation: 'UPDATE',
      operationName: fieldName,
      isSyncEnabled,
      mutation: true,
      modelName: type.name.value,
    };
    if (!this.resolverMap[resolverKey]) {
      const resolver = ctx.resolvers.generateMutationResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateUpdateRequestTemplate(requestConfig, ctx),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateDefaultResponseMappingTemplate(responseConfig),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
      // Todo: get the slot index from the resolver to keep the name unique and show the order of functions
      const updateInitConfig = {
        modelConfig,
        operation: 'UPDATE',
        operationName: fieldName,
      };
      resolver.addVtlFunctionToSlot(
        'init',
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateUpdateInitSlotTemplate(updateInitConfig),
          `${typeName}.${fieldName}.{slotName}.{slotIndex}.req.vtl`,
        ),
      );
      this.resolverMap[resolverKey] = resolver;
    }
    return this.resolverMap[resolverKey];
  };

  generateDeleteResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `delete${generateResolverKey(typeName, fieldName)}`;
    const vtlGenerator = this.getVTLGenerator();
    const modelIndexFields = type
      .fields!.filter((field) => field.directives?.some((it) => it.name.value === 'index'))
      .map((it) => it.name.value);
    const requestConfig = {
      operation: 'DELETE',
      operationName: fieldName,
      isSyncEnabled,
      modelName: type.name.value,
      modelIndexFields,
    };
    const responseConfig = {
      operation: 'DELETE',
      operationName: fieldName,
      isSyncEnabled,
      mutation: true,
      modelName: type.name.value,
    };
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateMutationResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateDeleteRequestTemplate(requestConfig, ctx),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateDefaultResponseMappingTemplate(responseConfig),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
    }
    return this.resolverMap[resolverKey];
  };

  generateOnCreateResolver = (
    ctx: TransformerContextProvider,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const resolverKey = `OnCreate${generateResolverKey(typeName, fieldName)}`;
    const vtlGenerator = this.getVTLGenerator();
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateSubscriptionResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        MappingTemplate.s3MappingTemplateFromString(vtlGenerator.generateSubscriptionRequestTemplate(), `${typeName}.${fieldName}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateSubscriptionResponseTemplate(),
          `${typeName}.${fieldName}.res.vtl`,
        ),
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
    const vtlGenerator = this.getVTLGenerator();
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateSubscriptionResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        MappingTemplate.s3MappingTemplateFromString(vtlGenerator.generateSubscriptionRequestTemplate(), `${typeName}.${fieldName}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateSubscriptionResponseTemplate(),
          `${typeName}.${fieldName}.res.vtl`,
        ),
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
    const vtlGenerator = this.getVTLGenerator();
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateSubscriptionResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        MappingTemplate.s3MappingTemplateFromString(vtlGenerator.generateSubscriptionRequestTemplate(), `${typeName}.${fieldName}.req.vtl`),
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateSubscriptionResponseTemplate(),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
    }
    return this.resolverMap[resolverKey];
  };

  generateSyncResolver = (
    ctx: TransformerContextProvider,
    type: ObjectTypeDefinitionNode,
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
  ): TransformerResolverProvider => {
    const isSyncEnabled = ctx.isProjectUsingDataStore();
    const dataSource = this.datasourceMap[type.name.value];
    const resolverKey = `Sync${generateResolverKey(typeName, fieldName)}`;
    const vtlGenerator = this.getVTLGenerator();
    const requestConfig = {
      operation: 'SYNC',
      operationName: fieldName,
      modelName: type.name.value,
    };
    const responseConfig = {
      ...requestConfig,
      isSyncEnabled,
      mutation: false,
      modelName: type.name.value,
    };
    if (!this.resolverMap[resolverKey]) {
      this.resolverMap[resolverKey] = ctx.resolvers.generateQueryResolver(
        typeName,
        fieldName,
        resolverLogicalId,
        dataSource,
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateSyncRequestTemplate(requestConfig),
          `${typeName}.${fieldName}.req.vtl`,
        ),
        MappingTemplate.s3MappingTemplateFromString(
          vtlGenerator.generateDefaultResponseMappingTemplate(responseConfig),
          `${typeName}.${fieldName}.res.vtl`,
        ),
      );
    }
    return this.resolverMap[resolverKey];
  };

  getQueryFieldNames = (
    type: ObjectTypeDefinitionNode,
  ): Set<{ fieldName: string; typeName: string; type: QueryFieldType; resolverLogicalId: string }> => {
    const typeName = type.name.value;
    const fields: Set<{ fieldName: string; typeName: string; type: QueryFieldType; resolverLogicalId: string }> = new Set();
    const modelDirectiveConfig = this.modelDirectiveMap.get(type.name.value);
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
    const modelDirectiveConfig = this.modelDirectiveMap.get(typeName);
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

    const modelDirectiveConfig = this.modelDirectiveMap.get(type.name.value);
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

  getDatasourceMap(): Record<string, DataSourceProvider> {
    return this.datasourceMap;
  }
}
