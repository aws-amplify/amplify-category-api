/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import {
  AppSyncFunctionConfigurationProvider,
  DataSourceProvider,
  GraphQLAPIProvider,
  MappingTemplateProvider,
  TransformerContextProvider,
  TransformerResolverProvider,
  TransformerResolversManagerProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { CfnFunctionConfiguration } from 'aws-cdk-lib/aws-appsync';
import { isResolvableObject, Lazy, Stack } from 'aws-cdk-lib';
import { toPascalCase } from 'graphql-transformer-common';
import { dedent } from 'ts-dedent';
import { Construct } from 'constructs';
import { MappingTemplate, S3MappingTemplate } from '../cdk-compat';
import { InvalidDirectiveError } from '../errors';
// eslint-disable-next-line import/no-cycle
import * as SyncUtils from '../transformation/sync-utils';

type Slot = {
  requestMappingTemplate?: MappingTemplateProvider;
  responseMappingTemplate?: MappingTemplateProvider;
  dataSource?: DataSourceProvider;
};

// Name of the None Data source used for pipeline resolver
export const NONE_DATA_SOURCE_NAME = 'NONE_DS';

/**
 * ResolverManager
 */
export class ResolverManager implements TransformerResolversManagerProvider {
  private resolvers: Map<string, TransformerResolverProvider> = new Map();

  generateQueryResolver = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    dataSource: DataSourceProvider,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ): TransformerResolver =>
    new TransformerResolver(
      typeName,
      fieldName,
      resolverLogicalId,
      requestMappingTemplate,
      responseMappingTemplate,
      ['init', 'preAuth', 'auth', 'postAuth', 'preDataLoad'],
      ['postDataLoad', 'finish'],
      dataSource,
    );

  generateMutationResolver = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    dataSource: DataSourceProvider,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ): TransformerResolver =>
    new TransformerResolver(
      typeName,
      fieldName,
      resolverLogicalId,
      requestMappingTemplate,
      responseMappingTemplate,
      ['init', 'preAuth', 'auth', 'postAuth', 'preUpdate'],
      ['postUpdate', 'finish'],
      dataSource,
    );

  generateSubscriptionResolver = (
    typeName: string,
    fieldName: string,
    resolverLogicalId: string,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
  ): TransformerResolver =>
    new TransformerResolver(
      typeName,
      fieldName,
      resolverLogicalId,
      requestMappingTemplate,
      responseMappingTemplate,
      ['init', 'preAuth', 'auth', 'postAuth', 'preSubscribe'],
      [],
    );

  addResolver = (typeName: string, fieldName: string, resolver: TransformerResolverProvider): TransformerResolverProvider => {
    const key = `${typeName}.${fieldName}`;
    if (this.resolvers.has(key)) {
      throw new Error(`A resolver for typeName ${typeName} fieldName: ${fieldName} already exists`);
    }
    this.resolvers.set(key, resolver);
    return resolver;
  };

  // eslint-disable-next-line consistent-return
  getResolver = (typeName: string, fieldName: string): TransformerResolverProvider | undefined => {
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

  private scope?: Construct;

  constructor(
    private typeName: string,
    private fieldName: string,
    private resolverLogicalId: string,
    private requestMappingTemplate: MappingTemplateProvider,
    private responseMappingTemplate: MappingTemplateProvider,
    private requestSlots: string[],
    private responseSlots: string[],
    private datasource?: DataSourceProvider,
    readonly runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty,
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
    if (!requestMappingTemplate) {
      throw new InvalidDirectiveError('requestMappingTemplate is required');
    }
    if (!responseMappingTemplate) {
      throw new InvalidDirectiveError('responseMappingTemplate is required');
    }
    this.slotNames = new Set([...requestSlots, ...responseSlots]);
  }

  /**
   * Map a resolver to a given stack.
   * @deprecated, use setScope instead.
   * @param stack the stack you are mapping to
   */
  mapToStack = (stack: Stack): void => {
    this.scope = stack;
  };

  setScope = (scope: Construct): void => {
    this.scope = scope;
  };

  addToSlot = (
    slotName: string,
    requestMappingTemplate?: MappingTemplateProvider,
    responseMappingTemplate?: MappingTemplateProvider,
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

    if (this.slotExists(slotName, requestMappingTemplate, responseMappingTemplate)) {
      this.updateSlot(slotName, requestMappingTemplate, responseMappingTemplate);
    } else {
      slotEntry.push({
        requestMappingTemplate,
        responseMappingTemplate,
        dataSource,
      });
    }
    this.slotMap.set(slotName, slotEntry);
  };

  slotExists = (
    slotName: string,
    requestMappingTemplate?: MappingTemplateProvider,
    responseMappingTemplate?: MappingTemplateProvider,
  ): boolean => this.findSlot(slotName, requestMappingTemplate, responseMappingTemplate) !== undefined;

  findSlot = (
    slotName: string,
    requestMappingTemplate?: MappingTemplateProvider,
    responseMappingTemplate?: MappingTemplateProvider,
  ): Slot | undefined => {
    const slotEntries = this.slotMap.get(slotName);
    const requestMappingTemplateName = (requestMappingTemplate as any)?.name ?? '';
    const responseMappingTemplateName = (responseMappingTemplate as any)?.name ?? '';
    if (!slotEntries || requestMappingTemplateName.includes('{slotIndex}') || responseMappingTemplateName.includes('{slotIndex}')) {
      return;
    }

    let slotIndex = 1;
    for (const slotEntry of slotEntries) {
      const [slotEntryRequestMappingTemplate, slotEntryResponseMappingTemplate] = [
        (slotEntry.requestMappingTemplate as any)?.name ?? 'NOT-FOUND',
        (slotEntry.responseMappingTemplate as any)?.name ?? 'NOT-FOUND',
        // eslint-disable-next-line no-loop-func
      ].map((name) => name.replace('{slotName}', slotName).replace('{slotIndex}', slotIndex));

      // If both request and response mapping templates are inline, skip check
      if (slotEntryRequestMappingTemplate === '' && slotEntryResponseMappingTemplate === '') {
        // eslint-disable-next-line no-continue
        continue;
      }

      // If name matches, then it is an overridden resolver
      if (
        slotEntryRequestMappingTemplate === requestMappingTemplateName ||
        slotEntryResponseMappingTemplate === responseMappingTemplateName
      ) {
        // eslint-disable-next-line consistent-return
        return slotEntry;
      }
      slotIndex++;
    }
  };

  updateSlot = (
    slotName: string,
    requestMappingTemplate?: MappingTemplateProvider,
    responseMappingTemplate?: MappingTemplateProvider,
  ): void => {
    const slot = this.findSlot(slotName, requestMappingTemplate, responseMappingTemplate);
    if (slot) {
      slot.requestMappingTemplate = (requestMappingTemplate as any)?.name ? requestMappingTemplate : slot.requestMappingTemplate;
      slot.responseMappingTemplate = (responseMappingTemplate as any)?.name ? responseMappingTemplate : slot.responseMappingTemplate;
    }
  };

  synthesize = (context: TransformerContextProvider, api: GraphQLAPIProvider): void => {
    const scope = this.scope || context.stackManager.scope;
    this.ensureNoneDataSource(api);
    const requestFns = this.synthesizeResolvers(scope, api, this.requestSlots);
    const responseFns = this.synthesizeResolvers(scope, api, this.responseSlots);
    // substitute template name values
    [this.requestMappingTemplate, this.requestMappingTemplate].map((template) => this.substituteSlotInfo(template, 'main', 0));

    const dataSourceProviderFn = api.host.addAppSyncFunction(
      toPascalCase([this.typeName, this.fieldName, 'DataResolverFn']),
      this.requestMappingTemplate,
      this.responseMappingTemplate,
      this.datasource?.name || NONE_DATA_SOURCE_NAME,
      scope,
      this.runtime,
    );

    let dataSourceType = 'NONE';
    let dataSource = '';
    if (this.datasource) {
      dataSourceType = this.datasource.ds.type;
      switch (dataSourceType) {
        case 'AMAZON_DYNAMODB':
          if (this.datasource.ds.dynamoDbConfig && !isResolvableObject(this.datasource.ds.dynamoDbConfig)) {
            const tableName = this.datasource.ds.dynamoDbConfig?.tableName;
            dataSource = `$util.qr($ctx.stash.put("tableName", "${tableName}"))`;
            if (
              this.datasource.ds.dynamoDbConfig?.deltaSyncConfig &&
              !isResolvableObject(this.datasource.ds.dynamoDbConfig?.deltaSyncConfig)
            ) {
              const deltaSyncTableTtl = Lazy.string({
                produce: (): string => {
                  if (
                    this.datasource &&
                    this.datasource.ds.dynamoDbConfig &&
                    !isResolvableObject(this.datasource.ds.dynamoDbConfig) &&
                    this.datasource.ds.dynamoDbConfig.deltaSyncConfig &&
                    !isResolvableObject(this.datasource.ds.dynamoDbConfig.deltaSyncConfig) &&
                    this.datasource.ds.dynamoDbConfig.deltaSyncConfig.deltaSyncTableTtl
                  ) {
                    return this.datasource.ds.dynamoDbConfig.deltaSyncConfig.deltaSyncTableTtl;
                  }
                  return SyncUtils.syncDataSourceConfig().DeltaSyncTableTTL.toString();
                },
              });
              dataSource += `\n$util.qr($ctx.stash.put("deltaSyncTableTtl", ${deltaSyncTableTtl}))`;
            }
          }

          if (context.isProjectUsingDataStore()) {
            // Remove the suffix "Table" from the datasource name
            // The stack name cannot be retrieved as during the runtime it is tokenized and value not being revealed
            const modelName = this.datasource.name.slice(0, -5);
            const syncConfig = SyncUtils.getSyncConfig(context, modelName)!;
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
            const endpoint = this.datasource.ds.elasticsearchConfig?.endpoint;
            dataSource = `$util.qr($ctx.stash.put("endpoint", "${endpoint}"))`;
          }
          break;
        case 'AWS_LAMBDA':
          if (this.datasource.ds.lambdaConfig && !isResolvableObject(this.datasource.ds.lambdaConfig)) {
            const lambdaFunctionArn = this.datasource.ds.lambdaConfig?.lambdaFunctionArn;
            dataSource = `$util.qr($ctx.stash.put("lambdaFunctionArn", "${lambdaFunctionArn}"))`;
          }
          break;
        case 'HTTP':
          if (this.datasource.ds.httpConfig && !isResolvableObject(this.datasource.ds.httpConfig)) {
            const endpoint = this.datasource.ds.httpConfig?.endpoint;
            dataSource = `$util.qr($ctx.stash.put("endpoint", "${endpoint}"))`;
          }
          break;
        case 'RELATIONAL_DATABASE':
          if (
            this.datasource.ds.relationalDatabaseConfig &&
            !isResolvableObject(this.datasource.ds.relationalDatabaseConfig) &&
            !isResolvableObject(this.datasource.ds.relationalDatabaseConfig?.rdsHttpEndpointConfig)
          ) {
            const databaseName = this.datasource.ds.relationalDatabaseConfig?.rdsHttpEndpointConfig!.databaseName;
            dataSource = `$util.qr($ctx.stash.metadata.put("databaseName", "${databaseName}"))`;
          }
          break;
        default:
          throw new Error('Unknown DataSource type');
      }
    }
    let initResolver = dedent`
      $util.qr($ctx.stash.put("typeName", "${this.typeName}"))
      $util.qr($ctx.stash.put("fieldName", "${this.fieldName}"))
      $util.qr($ctx.stash.put("conditions", []))
      $util.qr($ctx.stash.put("metadata", {}))
      $util.qr($ctx.stash.metadata.put("dataSourceType", "${dataSourceType}"))
      $util.qr($ctx.stash.metadata.put("apiId", "${api.apiId}"))
      $util.qr($ctx.stash.put("connectionAttributes", {}))
      ${dataSource}
    `;
    const account = Stack.of(context.stackManager.scope).account;
    const authRole = context.synthParameters.authenticatedUserRoleName;
    if (authRole) {
      initResolver += dedent`\n
      $util.qr($ctx.stash.put("authRole", "arn:aws:sts::${account}:assumed-role/${authRole}/CognitoIdentityCredentials"))
      `;
    }
    const unauthRole = context.synthParameters.unauthenticatedUserRoleName;
    if (unauthRole) {
      initResolver += dedent`\n
      $util.qr($ctx.stash.put("unauthRole", "arn:aws:sts::${account}:assumed-role/${unauthRole}/CognitoIdentityCredentials"))
      `;
    }
    const identityPoolId = context.synthParameters.identityPoolId;
    if (identityPoolId) {
      initResolver += dedent`\n
        $util.qr($ctx.stash.put("identityPoolId", "${identityPoolId}"))
      `;
    }
    const adminRoles = context.synthParameters.adminRoles ?? [];
    initResolver += dedent`\n
      $util.qr($ctx.stash.put("adminRoles", ${JSON.stringify(adminRoles)}))
    `;
    initResolver += '\n$util.toJson({})';

    initResolver = this.runtime
      ? dedent`
      export const request = (ctx) => {
        ctx.stash.typeName = '${this.typeName}';
        ctx.stash.fieldName = '${this.fieldName}';
        ctx.stash.metadata = { dataSourceType: '${dataSourceType}' };
        ctx.stash.metadata.apiId = '${api.apiId}';
        return {};
      };
    `
      : initResolver;

    // ctx.stash.metadata.dataSourceType = '${dataSourceType}';
    // ctx.stash.metadata.apiId = '${api.apiId}';

    const initResponseResolver = this.runtime
      ? dedent`
    export const response = (ctx) => {
      return ctx.prev.result;
    };
    `
      : '$util.toJson($ctx.prev.result)';

    api.host.addResolver(
      this.typeName,
      this.fieldName,
      MappingTemplate.inlineTemplateFromString(initResolver),
      MappingTemplate.inlineTemplateFromString(initResponseResolver),
      this.resolverLogicalId,
      undefined,
      [...requestFns, dataSourceProviderFn, ...responseFns].map((fn) => fn.functionId),
      scope,
      this.runtime,
    );
  };

  synthesizeResolvers = (scope: Construct, api: GraphQLAPIProvider, slotsNames: string[]): AppSyncFunctionConfigurationProvider[] => {
    const appSyncFunctions: AppSyncFunctionConfigurationProvider[] = [];

    for (const slotName of slotsNames) {
      if (this.slotMap.has(slotName)) {
        const slotEntries = this.slotMap.get(slotName);
        // Create individual functions
        let index = 0;
        for (const slotItem of slotEntries!) {
          const name = `${this.typeName}${this.fieldName}${slotName}${index++}Function`;
          const { requestMappingTemplate, responseMappingTemplate, dataSource } = slotItem;
          // eslint-disable-next-line no-unused-expressions
          requestMappingTemplate && this.substituteSlotInfo(requestMappingTemplate, slotName, index);
          // eslint-disable-next-line no-unused-expressions
          responseMappingTemplate && this.substituteSlotInfo(responseMappingTemplate, slotName, index);
          const fn = api.host.addAppSyncFunction(
            name,
            requestMappingTemplate || MappingTemplate.inlineTemplateFromString('$util.toJson({})'),
            responseMappingTemplate || MappingTemplate.inlineTemplateFromString('$util.toJson({})'),
            dataSource?.name || NONE_DATA_SOURCE_NAME,
            scope,
            this.runtime,
          );
          appSyncFunctions.push(fn);
        }
      }
    }
    return appSyncFunctions;
  };

  /**
   * substituteSlotInfo
   */
  private substituteSlotInfo(template: MappingTemplateProvider, slotName: string, index: number): void {
    // Check the constructor name instead of using 'instanceof' because the latter does not work
    // with copies of the class, which happens with custom transformers.
    // See: https://github.com/aws-amplify/amplify-cli/issues/9362
    if (template.constructor.name === S3MappingTemplate.name) {
      (template as S3MappingTemplate).substituteValues({
        slotName,
        slotIndex: index,
        typeName: this.typeName,
        fieldName: this.fieldName,
      });
    }
  }

  /**
   * ensureNoneDataSource
   */
  private ensureNoneDataSource(api: GraphQLAPIProvider): void {
    if (!api.host.hasDataSource(NONE_DATA_SOURCE_NAME)) {
      api.host.addNoneDataSource(NONE_DATA_SOURCE_NAME, {
        name: NONE_DATA_SOURCE_NAME,
        description: 'None Data Source for Pipeline functions',
      });
    }
  }
}
