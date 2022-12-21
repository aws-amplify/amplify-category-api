import {
  AppSyncFunctionConfigurationProvider,
  DataSourceProvider,
  GraphQLAPIProvider,
  MappingTemplateProvider,
  TransformerContextProvider,
  TransformerResolverProvider,
  TransformerResolversManagerProvider,
  AppSyncExecutionStrategy,
  AppSyncTemplateExecutionStrategy,
  AppSyncCodeExecutionStrategy,
} from '@aws-amplify/graphql-transformer-interfaces';
import { AuthorizationType, CfnFunctionConfiguration } from '@aws-cdk/aws-appsync';
import { isResolvableObject, Stack, CfnParameter } from '@aws-cdk/core';
import { toPascalCase } from 'graphql-transformer-common';
import { dedent } from 'ts-dedent';
import { MappingTemplate, S3MappingTemplate } from '../cdk-compat';
import { InvalidDirectiveError } from '../errors';
import * as SyncUtils from '../transformation/sync-utils';
import { IAM_AUTH_ROLE_PARAMETER, IAM_UNAUTH_ROLE_PARAMETER } from '../utils';
import { StackManager } from './stack-manager';
import { format }from 'prettier';

type Slot = {
  dataSource?: DataSourceProvider;
  strategy: AppSyncExecutionStrategy;
};

// Name of the None Data source used for pipeline resolver
const NONE_DATA_SOURCE_NAME = 'NONE_DS';

const FILE_FORMAT_PATTERN = /\.[a-zA-Z]*$/;
const TEMPLATE_SLOT_FILENAME_PATTERN = /\.(req|res).vtl$/;

/**
 * ResolverManager
 */
export class ResolverManager implements TransformerResolversManagerProvider {
  private resolvers: Map<string, TransformerResolverProvider> = new Map();

  /**
   * @deprecated use generateQueryResolverWithStrategy, which supports all appsync runtimes
   */
  generateQueryResolver = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    datasource: DataSourceProvider,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ): TransformerResolver => this.generateQueryResolverWithStrategy(
    typeName,
    fieldName,
    resolverLogicalId,
    datasource,
    { type: 'TEMPLATE', requestMappingTemplate, responseMappingTemplate },
  );

  generateQueryResolverWithStrategy = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    datasource: DataSourceProvider,
    strategy: AppSyncExecutionStrategy,
  ): TransformerResolver => TransformerResolver.fromStrategy({
    typeName,
    fieldName,
    resolverLogicalId,
    strategy,
    requestSlots: ['init', 'preAuth', 'auth', 'postAuth', 'preDataLoad'],
    responseSlots: ['postDataLoad', 'finish'],
    datasource,
  });

  /**
   * @deprecated use generateMutationResolverWithStrategy, which supports all appsync runtimes
   */
  generateMutationResolver = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    datasource: DataSourceProvider,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ): TransformerResolver => this.generateMutationResolverWithStrategy(
    typeName,
    fieldName,
    resolverLogicalId,
    datasource,
    { type: 'TEMPLATE', requestMappingTemplate, responseMappingTemplate },
  );

  generateMutationResolverWithStrategy = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    datasource: DataSourceProvider,
    strategy: AppSyncExecutionStrategy,
  ): TransformerResolver => TransformerResolver.fromStrategy({
    typeName,
    fieldName,
    resolverLogicalId,
    strategy,
    requestSlots: ['init', 'preAuth', 'auth', 'postAuth', 'preUpdate'],
    responseSlots: ['postUpdate', 'finish'],
    datasource,
  });

  /**
   * @deprecated use generateSubscriptionResolverWithStrategy, which supports all appsync runtimes
   */
  generateSubscriptionResolver = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ): TransformerResolver => this.generateSubscriptionResolverWithStrategy(
    typeName,
    fieldName,
    resolverLogicalId,
    { type: 'TEMPLATE', requestMappingTemplate, responseMappingTemplate },
  );

  generateSubscriptionResolverWithStrategy = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    strategy: AppSyncExecutionStrategy,
  ): TransformerResolver => TransformerResolver.fromStrategy({
    typeName,
    fieldName,
    resolverLogicalId,
    strategy,
    requestSlots: ['init', 'preAuth', 'auth', 'postAuth', 'preSubscribe'],
    responseSlots: [],
  });

  addResolver = (typeName: string, fieldName: string, resolver: TransformerResolverProvider): TransformerResolverProvider => {
    const key = `${typeName}.${fieldName}`;
    if (this.resolvers.has(key)) {
      throw new Error(`A resolver for typeName ${typeName} fieldName: ${fieldName} already exists`);
    }
    this.resolvers.set(key, resolver);
    return resolver;
  };

  getResolver = (typeName: string, fieldName: string): TransformerResolverProvider | void => {
    const key = `${typeName}.${fieldName}`;
    if (this.resolvers.has(key)) {
      return this.resolvers.get(key) as TransformerResolverProvider;
    }
  };

  hasResolver = (typeName: string, fieldName: string): boolean => {
    const key = `${typeName}.${fieldName}`;
    return this.resolvers.has(key);
  };

  removeResolver = (typeName: string, fieldName: string): TransformerResolverProvider => {
    const key = `${typeName}.${fieldName}`;
    if (this.resolvers.has(key)) {
      const resolver = this.resolvers.get(key) as TransformerResolverProvider;
      this.resolvers.delete(key);
      return resolver;
    }
    throw new Error(`Resolver for typeName ${typeName} fieldName: ${fieldName} does not exists`);
  };

  collectResolvers = (): Map<string, TransformerResolverProvider> => new Map(this.resolvers.entries());
}

/**
 * TransformerResolver
 */
export class TransformerResolver implements TransformerResolverProvider {
  private readonly slotMap: Map<string, Slot[]> = new Map();
  private readonly slotNames: Set<string>;
  private stack?: Stack;
  private stackName?: string;
  private strategy: AppSyncExecutionStrategy

  constructor(
    private typeName: string,
    private fieldName: string,
    private resolverLogicalId: string,
    requestMappingTemplate: MappingTemplateProvider | undefined,
    responseMappingTemplate: MappingTemplateProvider | undefined,
    private requestSlots: string[],
    private responseSlots: string[],
    private datasource?: DataSourceProvider,
    strategy? : AppSyncExecutionStrategy,
  ) {
    if (!typeName) {
      throw new InvalidDirectiveError('typeName is required');
    }
    if (!fieldName) {
      throw new InvalidDirectiveError('fieldName is required');
    }
    if (!resolverLogicalId) {
      throw new InvalidDirectiveError('resolverLogicalId is required');
    }

    if (strategy) {
      this.strategy = strategy;
    } else if (requestMappingTemplate && responseMappingTemplate) {
    this.strategy = { type: 'TEMPLATE', requestMappingTemplate, responseMappingTemplate };
    } else {
      throw new InvalidDirectiveError('Either strategy, or both requestMappingTemplate and responseMappingTemplate must be provided.');
    }

    this.slotNames = new Set([...requestSlots, ...responseSlots]);
  }

  static fromStrategy = ({
    typeName,
    fieldName,
    resolverLogicalId,
    requestSlots,
    responseSlots,
    datasource,
    strategy,
  }: {
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    requestSlots: string[],
    responseSlots: string[],
    datasource?: DataSourceProvider,
    strategy : AppSyncExecutionStrategy,
  }): TransformerResolver => new TransformerResolver(
    typeName,
    fieldName,
    resolverLogicalId,
    undefined,
    undefined,
    requestSlots,
    responseSlots,
    datasource,
    strategy,
  );

  mapToStack = (stack: Stack) => {
    this.stack = stack;
    this.stackName = stack.stackName;
  };

  getStackName = () => {
    return this.stackName ?? '';
  };

  /**
   * @deprecated use addToSlotWithStrategy, which supports all appsync runtimes
   */
  addToSlot = (
    slotName: string,
    requestMappingTemplate?: MappingTemplateProvider,
    responseMappingTemplate?: MappingTemplateProvider,
    dataSource?: DataSourceProvider,
  ): void => this.addToSlotWithStrategy(
    slotName,
    { type: 'TEMPLATE', requestMappingTemplate, responseMappingTemplate },
    dataSource,
  );

  addToSlotWithStrategy = (
    slotName: string,
    strategy: AppSyncExecutionStrategy,
    dataSource?: DataSourceProvider,
  ): void => {
    if (!this.slotNames.has(slotName)) {
      throw new Error(`Resolver is missing slot ${slotName}`);
    }
    let slotEntry: Slot[];
    if (this.slotMap.has(slotName)) {
      slotEntry = this.slotMap.get(slotName)!;
    } else {
      slotEntry = [];
    }

    if (this.slotExistsForStrategy(slotName, strategy)) {
      this.updateSlotForStrategy(slotName, strategy);
    } else {
      slotEntry.push({ strategy, dataSource });
    }
    this.slotMap.set(slotName, slotEntry);
  };

  /**
   * @deprecated - use slotExistsForStrategy instead.
   */
  slotExists = (
    slotName: string,
    requestMappingTemplate?: MappingTemplateProvider,
    responseMappingTemplate?: MappingTemplateProvider,
  ) => this.slotExistsForStrategy(
    slotName,
    { type: 'TEMPLATE', requestMappingTemplate, responseMappingTemplate },
  );

  /**
   * Determine if we can find an existing function in a given slot that matches up by name.
   */
  slotExistsForStrategy = (
    slotName: string,
    strategy: AppSyncExecutionStrategy,
  ): boolean => this.findSlotForStrategy({ slotName, strategy }) !== undefined

  /**
   * Determine if the templates are already defined in a given slot, for use in the decision to create/update functions.
   * @deprecated - use findSlotForStrategy instead
   */
  findSlot = (
    slotName: string,
    requestMappingTemplate?: MappingTemplateProvider,
    responseMappingTemplate?: MappingTemplateProvider,
  ) => this.findSlotForStrategy({
    slotName,
    strategy: { type: 'TEMPLATE', requestMappingTemplate, responseMappingTemplate} },
  );

  /**
   * Find a slot for a given slot name and strategy, this is done by matching up the names, using trimmed names to
   * compare between different strategy types.
   * e.g. Query.getBlog.postDataLoad.1.req.vtl will collide with Query.getBlog.postDataLoad.1.js
   */
  findSlotForStrategy = ({
    slotName,
    strategy,
  }: {
    slotName: string,
    strategy: AppSyncExecutionStrategy,
  }): Slot | undefined => {
    const slotEntries = this.slotMap.get(slotName);

    const requestMappingTemplateName: string = strategy.type === 'TEMPLATE' ? (strategy.requestMappingTemplate as any)?.name?.replace(TEMPLATE_SLOT_FILENAME_PATTERN, '') ?? '' : '';
    const responseMappingTemplateName: string = strategy.type === 'TEMPLATE' ? (strategy.responseMappingTemplate as any)?.name?.replace(TEMPLATE_SLOT_FILENAME_PATTERN, '') ?? '' : '';
    const codeTemplateName: string = strategy.type === 'CODE' ? (strategy.code as any)?.name?.replace(FILE_FORMAT_PATTERN, '') ?? '' : '';

    if (!slotEntries || [requestMappingTemplateName, responseMappingTemplateName, codeTemplateName].some(name => name.includes('{slotIndex}'))) {
      return;
    }

    let slotIndex = 1;
    for (const slotEntry of slotEntries) {

      const isSameStrategyType = strategy.type === slotEntry.strategy.type;

      switch(slotEntry.strategy.type) {
        case 'TEMPLATE':
          const [slotEntryRequestMappingTemplate, slotEntryResponseMappingTemplate]: string[] = [
            (slotEntry.strategy.requestMappingTemplate as any)?.name ?? 'NOT-FOUND',
            (slotEntry.strategy.responseMappingTemplate as any)?.name ?? 'NOT-FOUND',
          ]
            .map(name => name.replace('{slotName}', slotName).replace('{slotIndex}', slotIndex).replace(TEMPLATE_SLOT_FILENAME_PATTERN, ''));
    
          // If both request and response mapping templates are inline, skip check
          if (slotEntryRequestMappingTemplate === '' && slotEntryResponseMappingTemplate === '') {
            continue;
          }
    
          // If type and name matches, then it is an overridden resolver
          // If type mismatches and trimmed names match, then it is an overridden resolver
          // This is really verbose, keeping it this way for now
          if (
            (isSameStrategyType && (
              slotEntryRequestMappingTemplate === requestMappingTemplateName ||
              slotEntryResponseMappingTemplate === responseMappingTemplateName
            )) ||
            (!isSameStrategyType && [slotEntryRequestMappingTemplate, slotEntryResponseMappingTemplate].some(name => name === codeTemplateName))
          ) {
            return slotEntry;
          }
          break;
        case 'CODE':
          const slotEntryCodeTemplate = ((slotEntry.strategy.code as any)?.name ?? 'NOT-FOUND')
            .replace('{slotName}', slotName)
            .replace('{slotIndex}', slotIndex)
            .replace(FILE_FORMAT_PATTERN, '')

          // If inline, skip check
          if (slotEntryCodeTemplate === '') {
            continue;
          }
    
          // If type and name matches, then it is an overridden resolver
          // If type mismatches and trimmed names match, then it is an overridden resolver
          // This is really verbose, keeping it this way for now
          if (
            (isSameStrategyType && codeTemplateName === slotEntryCodeTemplate) ||
            (!isSameStrategyType && [requestMappingTemplateName, responseMappingTemplateName].some(name => name === slotEntryCodeTemplate))
          ) {
            return slotEntry;
          }
          break;
      }

      slotIndex++;
    }
  }

  /**
   * @deprecated - use updateSlotForStrategy instead
   */
  updateSlot = (
    slotName: string,
    requestMappingTemplate?: MappingTemplateProvider,
    responseMappingTemplate?: MappingTemplateProvider,
  ) => this.updateSlotForStrategy(
    slotName,
    { type: 'TEMPLATE', requestMappingTemplate, responseMappingTemplate },
  );

  /**
   * Update an existing function with a new strategy, and merge templates if possible.
   */
 updateSlotForStrategy = (
    slotName: string,
    strategy: AppSyncExecutionStrategy,
  ): void => {
    const slot = this.findSlotForStrategy({ slotName, strategy });
    if (slot) {
      // If we're updating an atomic 'strategy', as in the case of code strategies, or when replacing a code strategy, replace whole hog.
      if (strategy.type === 'CODE' || slot.strategy.type === 'CODE') {
        slot.strategy = strategy;
        return;
      }

      // If we're updating template-based mappings with another template mapping, merge in the templates (to allow independent req/res templates)
      slot.strategy.requestMappingTemplate = (strategy.requestMappingTemplate as any)?.name
        ? strategy.requestMappingTemplate
        : slot.strategy.requestMappingTemplate;
      slot.strategy.responseMappingTemplate = (strategy.responseMappingTemplate as any)?.name
        ? strategy.responseMappingTemplate
        : slot.strategy.responseMappingTemplate;
    }
  }

  synthesize = (context: TransformerContextProvider, api: GraphQLAPIProvider): void => {
    const stack = this.stack || (context.stackManager as StackManager).rootStack;
    this.ensureNoneDataSource(api);
    const requestFns = this.synthesizeResolvers(stack, api, this.requestSlots);
    const responseFns = this.synthesizeResolvers(stack, api, this.responseSlots);
      
    this.substituteSlotInfoForStrategy(this.strategy, 'main', 0);

    const dataSourceProviderFn = api.host.addAppSyncFunctionWithStrategy(
      toPascalCase([this.typeName, this.fieldName, 'DataResolverFn']),
      this.strategy,
      this.datasource?.name || NONE_DATA_SOURCE_NAME,
      stack,
    );

    const dataSourceType = this.datasource?.ds.type ?? 'NONE';
    const stash: Record<string, any> = {
      typeName: this.typeName,
      fieldName: this.fieldName,
      conditions: [],
      metadata: {
        dataSourceType,
        apiId: api.apiId,
      },
    };
    if (this.datasource) {
      switch (dataSourceType) {
        case 'AMAZON_DYNAMODB':
          if (this.datasource.ds.dynamoDbConfig && !isResolvableObject(this.datasource.ds.dynamoDbConfig)) {
            stash.tableName = this.datasource.ds.dynamoDbConfig?.tableName;
          }

          if (context.isProjectUsingDataStore()) {
            const syncConfig = SyncUtils.getSyncConfig(context, this.typeName)!;
            const funcConf = dataSourceProviderFn.node.children.find(
              (it: any) => it.cfnResourceType === 'AWS::AppSync::FunctionConfiguration',
            ) as CfnFunctionConfiguration;

            if (funcConf) {
              funcConf.syncConfig = {
                conflictDetection: syncConfig.ConflictDetection,
                conflictHandler: syncConfig.ConflictHandler,
                ...(SyncUtils.isLambdaSyncConfig(syncConfig)
                  ? {
                    lambdaConflictHandlerConfig: {
                      lambdaConflictHandlerArn: syncConfig.LambdaConflictHandler.lambdaArn,
                    },
                  }
                  : {}),
              };
            }
          }

          break;
        case 'AMAZON_ELASTICSEARCH':
          if (this.datasource.ds.elasticsearchConfig && !isResolvableObject(this.datasource.ds.elasticsearchConfig)) {
            stash.endpoint = this.datasource.ds.elasticsearchConfig?.endpoint;
          }
          break;
        case 'AWS_LAMBDA':
          if (this.datasource.ds.lambdaConfig && !isResolvableObject(this.datasource.ds.lambdaConfig)) {
            stash.lambdaFunctionArn = this.datasource.ds.lambdaConfig?.lambdaFunctionArn;
          }
          break;
        case 'HTTP':
          if (this.datasource.ds.httpConfig && !isResolvableObject(this.datasource.ds.httpConfig)) {
            stash.endpoint = this.datasource.ds.httpConfig?.endpoint;
          }
          break;
        case 'RELATIONAL_DATABASE':
          if (
            this.datasource.ds.relationalDatabaseConfig
            && !isResolvableObject(this.datasource.ds.relationalDatabaseConfig)
            && !isResolvableObject(this.datasource.ds.relationalDatabaseConfig?.rdsHttpEndpointConfig)
          ) {
            stash.metadata.databaseName = this.datasource.ds.relationalDatabaseConfig?.rdsHttpEndpointConfig!.databaseName;
          }
          break;
        default:
          throw new Error('Unknown DataSource type');
      }
    }


    const authModes = [context.authConfig.defaultAuthentication, ...(context.authConfig.additionalAuthenticationProviders || [])].map(
      mode => mode?.authenticationType,
    );
    if (authModes.includes(AuthorizationType.IAM)) {
      const authRoleParameter = (context.stackManager.getParameter(IAM_AUTH_ROLE_PARAMETER) as CfnParameter).valueAsString;
      const unauthRoleParameter = (context.stackManager.getParameter(IAM_UNAUTH_ROLE_PARAMETER) as CfnParameter).valueAsString;

      stash.authRole = `arn:aws:sts::${Stack.of(context.stackManager.rootStack).account}:assumed-role/${unauthRoleParameter}/CognitoIdentityCredentials`;
      stash.unauthRole = `arn:aws:sts::${Stack.of(context.stackManager.rootStack).account}:assumed-role/${authRoleParameter}/CognitoIdentityCredentials`;
    }
    
    // N.B. context.stash = { <contents> }; doesn't seem to work, so assigning in a foreach.
    const resolverCode = format(`
      /**
       * Configure stash variables which will be used downstream in the linked functions.
       */
      export function request (context) {
        Object.entries(${JSON.stringify(stash)}).forEach(([name, value]) => (context.stash[name] = value));
        return {};
      }

      /**
       * No-op response function.
       */
      export function response(context) {
        return context.prev.result;
      }
    `,
    {
      parser: 'babel',
      singleQuote: true,
    });

    api.host.addResolverWithStrategy(
      this.typeName,
      this.fieldName,
      {
        type: 'CODE',
        code: MappingTemplate.inlineTemplateFromString(resolverCode),
        runtime: { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' },
      },
      this.resolverLogicalId,
      undefined,
      [...requestFns, dataSourceProviderFn, ...responseFns].map(fn => fn.functionId),
      stack,
    );
  };

  /**
   * For all functions in all defined slots, render out to AppSyncFunctionConfigurationProviders,
   * attached to the relevant stacks and api.
   */
  synthesizeResolvers = (stack: Stack, api: GraphQLAPIProvider, slotsNames: string[]): AppSyncFunctionConfigurationProvider[] => {
    const appSyncFunctions: AppSyncFunctionConfigurationProvider[] = [];

    for (const slotName of slotsNames) {
      if (this.slotMap.has(slotName)) {
        const slotEntries = this.slotMap.get(slotName);
        // Create individual functions
        let index = 0;
        for (const slotItem of slotEntries!) {
          const name = `${this.typeName}${this.fieldName}${slotName}${index++}Function`;
          const { strategy, dataSource } = slotItem;

          this.substituteSlotInfoForStrategy(strategy, slotName, index);

          appSyncFunctions.push(api.host.addAppSyncFunctionWithStrategy(
            name,
            this.imputeMappingTemplates(strategy),
            dataSource?.name || NONE_DATA_SOURCE_NAME,
            stack,
          ));
        }
      }
    }
    return appSyncFunctions;
  };

  /**
   * For TEMPLATE based strategies, fill in either a missing req or res mapping template.
   */
  private imputeMappingTemplates = (strategy: AppSyncExecutionStrategy): AppSyncExecutionStrategy => {
    if (strategy.type === 'CODE') {
      return strategy;
    }

    return {
      type: strategy.type,
      requestMappingTemplate: strategy.requestMappingTemplate || MappingTemplate.inlineTemplateFromString('$util.toJson({})'),
      responseMappingTemplate: strategy.responseMappingTemplate || MappingTemplate.inlineTemplateFromString('$util.toJson({})'),
    }
  };

  /**
   * Perform substitutions in the Mapping names for all mappings in a strategy.
   */
  private substituteSlotInfoForStrategy(strategy: AppSyncExecutionStrategy, slotName: string, index: number) {
    [
      (strategy as AppSyncTemplateExecutionStrategy).requestMappingTemplate,
      (strategy as AppSyncTemplateExecutionStrategy).responseMappingTemplate,
      (strategy as AppSyncCodeExecutionStrategy).code,
    ]
      .filter(template => template !== undefined)
      .forEach(template => {
        // Check the constructor name instead of using 'instanceof' because the latter does not work
        // with copies of the class, which happens with custom transformers.
        // See: https://github.com/aws-amplify/amplify-cli/issues/9362
        if (template?.constructor.name === S3MappingTemplate.name) {
          (template as S3MappingTemplate).substitueValues({ slotName, slotIndex: index, typeName: this.typeName, fieldName: this.fieldName });
        }
      });
  }

  /**
   * ensureNoneDataSource
   */
  private ensureNoneDataSource(api: GraphQLAPIProvider) {
    if (!api.host.hasDataSource(NONE_DATA_SOURCE_NAME)) {
      api.host.addNoneDataSource(NONE_DATA_SOURCE_NAME, {
        name: NONE_DATA_SOURCE_NAME,
        description: 'None Data Source for Pipeline functions',
      });
    }
  }
}
