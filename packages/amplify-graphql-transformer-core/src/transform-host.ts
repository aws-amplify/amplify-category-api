import * as path from 'path';
import hash from 'object-hash';

import { CustomResource, Duration, Token } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import {
  BaseDataSource,
  CfnDataSource,
  DataSourceOptions,
  DynamoDbDataSource,
  HttpDataSource,
  HttpDataSourceOptions,
  LambdaDataSource,
  NoneDataSource,
  CfnResolver,
  CfnFunctionConfiguration,
} from 'aws-cdk-lib/aws-appsync';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IRole, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnFunction, Code, Function, IFunction, ILayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';

import {
  AssetProvider,
  DynamoDbDataSourceOptions,
  FunctionRuntimeTemplate,
  JSRuntimeTemplate,
  MappingTemplateProvider,
  MappingTemplateType,
  SearchableDataSourceOptions,
  TransformerContextProvider,
  TransformHostProvider,
  VpcConfig,
  VTLRuntimeTemplate,
} from '@aws-amplify/graphql-transformer-interfaces';

import { ResolverResourceIDs, resourceName, toCamelCase } from 'graphql-transformer-common';

// eslint-disable-next-line import/no-cycle
import { AppSyncFunctionConfiguration } from './appsync-function';
import { SearchableDataSource } from './cdk-compat/searchable-datasource';
import { S3MappingFunctionCode } from './cdk-compat/template-asset';
import { GraphQLApi } from './graphql-api';
import { setResourceName } from './utils';
import { getRuntimeSpecificFunctionProps, isJsResolverFnRuntime } from './utils/function-runtime';
import { APPSYNC_JS_RUNTIME, VTL_RUNTIME } from './types';

type Slot = {
  requestMappingTemplate?: string;
  responseMappingTemplate?: string;
  codeMappingTemplate?: string;
  dataSource?: string;
};

export interface DefaultTransformHostOptions {
  readonly api: GraphQLApi;
}

interface ResolverManagerCustomResourceProperties {
  apiId: string;
  computedResourcesAssetBucket: string;
  computedResourcesAssetKey: string;
  resourceHash: string;
}

type AppSyncResource = AppSyncPipelineResolverResource | AppSyncFunctionResource;

interface AppSyncPipelineResolverResource {
  type: 'PipelineResolver';
  fieldName: string;
  typeName: string;
  kind: 'PIPELINE';
  requestMappingTemplate: string;
  responseMappingTemplate: string;
  pipelineConfig: {
    functions: string[];
  };
}

type AppSyncFunctionResource = AppSyncJsFunctionResource | AppSyncVtlFunctionResource;

interface AppSyncJsFunctionResource {
  type: 'AppSyncJsFunction';
  functionId: string;
  dataSource: string;
  codeMappingTemplate: string;
}

interface AppSyncVtlFunctionResource {
  type: 'AppSyncVtlFunction';
  functionId: string;
  dataSource: string;
  requestMappingTemplate: string;
  responseMappingTemplate: string;
}

export class DefaultTransformHost implements TransformHostProvider {
  private dataSources: Map<string, BaseDataSource> = new Map();

  private resolvers: Map<string, CfnResolver> = new Map();

  private appsyncFunctions: Map<string, AppSyncFunctionConfiguration> = new Map();

  private resources: Record<string, AppSyncResource> = {};

  private api: GraphQLApi;

  public constructor(options: DefaultTransformHostOptions) {
    this.api = options.api;
  }

  public setAPI(api: GraphQLApi): void {
    this.api = api;
  }

  public hasDataSource(name: string): boolean {
    return this.dataSources.has(name);
  }

  public getDataSource = (name: string): BaseDataSource | void => {
    return this.hasDataSource(name) ? this.dataSources.get(name) : undefined;
  };

  public hasResolver = (typeName: string, fieldName: string): boolean => this.resolvers.has(`${typeName}:${fieldName}`);

  public getResolver = (typeName: string, fieldName: string): CfnResolver | void => {
    const resolverRef = `${typeName}:${fieldName}`;
    return this.resolvers.has(resolverRef) ? this.resolvers.get(resolverRef) : undefined;
  };

  /**
   * Create an AWS Custom Resource to manage AppSync resolvers and functions. This structure abstracts the multiple CFN resources created
   * for all models into a single resource, working around CFN limits like the 500 resources/stack and the 2500 operations per stack update.
   *
   * Internally, this method uses the {@link TemplateValueMapper} of the context to create a JSON representation of the resources.
   */
  createResourceManagerResource = (context: TransformerContextProvider): void => {
    const customResourceStack = context.stackManager.getScopeFor('ResolverManagerStack', 'ResolverManagerStack');

    const resourceBucket = new Bucket(customResourceStack, 'ResourcesBucket', {
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
    });

    const tvp = context.templateValueMapper;
    tvp.bind(customResourceStack, 'ResolverManagerStackValueMapper');

    const valueMappedResources: any = {};
    Object.entries(this.resources).forEach(([name, resource]) => {
      if (resource.type === 'PipelineResolver') {
        resource.requestMappingTemplate = tvp.resolve(resource.requestMappingTemplate);
        resource.responseMappingTemplate = tvp.resolve(resource.responseMappingTemplate);
      } else if (resource.type === 'AppSyncJsFunction') {
        resource.codeMappingTemplate = tvp.resolve(resource.codeMappingTemplate);
      } else if (resource.type === 'AppSyncVtlFunction') {
        resource.requestMappingTemplate = tvp.resolve(resource.requestMappingTemplate);
        resource.responseMappingTemplate = tvp.resolve(resource.responseMappingTemplate);
      }
      valueMappedResources[name] = resource;
    });

    const computedResourcesObjectKey = 'computed-resources.json';
    const deployment = new BucketDeployment(customResourceStack, 'ResourcesBucketDeployment', {
      destinationBucket: resourceBucket,
      sources: [Source.jsonData(computedResourcesObjectKey, valueMappedResources)],
    });
    deployment.node.addDependency(this.api);

    const lambdaCodePath = path.join(__dirname, '..', 'lib', 'resolver-manager');
    console.log(path.normalize(lambdaCodePath));

    // TODO: Generally, provider policies need to have access to "*" resources since they may be reused across instances. But do we actually
    // create multiple instances?
    const customResourceProvider = new Provider(customResourceStack, 'AmplifyResolverManagerProvider', {
      providerFunctionName: 'AmplifyResolverManagerProviderFn',
      onEventHandler: new Function(customResourceStack, 'AmplifyResolverManagerOnEventFn', {
        functionName: 'AmplifyResolverManagerOnEventFn',
        code: Code.fromAsset(lambdaCodePath),
        handler: 'index.handler',
        runtime: Runtime.NODEJS_18_X,
        timeout: Duration.minutes(10),
        initialPolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'appsync:CreateFunction',
              'appsync:CreateResolver',
              'appsync:DeleteFunction',
              'appsync:DeleteResolver',
              'appsync:ListFunctions',
              'appsync:ListResolvers',
              'appsync:ListTypes',
            ],
            resources: ['*'],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['s3:GetObject'],
            resources: ['*'],
          }),
        ],
      }),
    });

    const properties: ResolverManagerCustomResourceProperties = {
      apiId: this.api.apiId,
      computedResourcesAssetBucket: deployment.deployedBucket.bucketName,
      computedResourcesAssetKey: computedResourcesObjectKey,
      resourceHash: hash(this.resources),
    };

    const customResource = new CustomResource(customResourceStack, 'ResolverManagerCustomResource', {
      resourceType: 'Custom::AmplifyResolverManager',
      serviceToken: customResourceProvider.serviceToken,
      properties,
    });
    customResource.node.addDependency(deployment);

    this.dataSources.forEach((ds) => {
      customResource.node.addDependency(ds);
      customResourceProvider.node.addDependency(ds);
      deployment.node.addDependency(ds);
    });
  };

  addSearchableDataSource(
    name: string,
    awsRegion: string,
    endpoint: string,
    options?: SearchableDataSourceOptions,
    scope?: Construct,
  ): SearchableDataSource {
    if (this.dataSources.has(name)) {
      throw new Error(`DataSource ${name} already exists in the API`);
    }
    const data = this.doAddSearchableDataSource(name, endpoint, awsRegion, options, scope);
    this.dataSources.set(options?.name || name, data);
    return data;
  }

  public addHttpDataSource = (name: string, endpoint: string, options?: DataSourceOptions, scope?: Construct): HttpDataSource => {
    if (this.dataSources.has(name)) {
      throw new Error(`DataSource ${name} already exists in the API`);
    }
    const dataSource = this.doAddHttpDataSource(name, endpoint, options, scope);
    this.dataSources.set(name, dataSource);
    return dataSource;
  };

  public addDynamoDbDataSource = (
    name: string,
    table: ITable,
    options?: DynamoDbDataSourceOptions,
    scope?: Construct,
  ): DynamoDbDataSource => {
    if (this.dataSources.has(name)) {
      throw new Error(`DataSource ${name} already exists in the API`);
    }
    const dataSource = this.doAddDynamoDbDataSource(name, table, options, scope);
    this.dataSources.set(options?.name || name, dataSource);
    return dataSource;
  };

  public addNoneDataSource = (name: string, options?: DataSourceOptions, scope?: Construct): NoneDataSource => {
    if (this.dataSources.has(name)) {
      throw new Error(`DataSource ${name} already exists in the API`);
    }
    const dataSource = this.doAddNoneDataSource(name, options, scope);
    this.dataSources.set(name, dataSource);
    return dataSource;
  };

  public addLambdaDataSource = (
    name: string,
    lambdaFunction: IFunction,
    options?: DataSourceOptions,
    scope?: Construct,
  ): LambdaDataSource => {
    if (!Token.isUnresolved(name) && this.dataSources.has(name)) {
      throw new Error(`DataSource ${name} already exists in the API`);
    }
    const dataSource = this.doAddLambdaDataSource(name, lambdaFunction, options, scope);
    this.dataSources.set(name, dataSource);
    return dataSource;
  };

  public addAppSyncJsRuntimeFunction = (
    name: string,
    codeMappingTemplate: MappingTemplateProvider,
    dataSourceName: string,
    scope?: Construct,
  ): AppSyncFunctionConfiguration => {
    return this.addAppSyncFunction(name, { codeMappingTemplate }, dataSourceName, scope, APPSYNC_JS_RUNTIME);
  };

  public addAppSyncVtlRuntimeFunction = (
    name: string,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
    dataSourceName: string,
    scope?: Construct,
  ): AppSyncFunctionConfiguration => {
    return this.addAppSyncFunction(name, { requestMappingTemplate, responseMappingTemplate }, dataSourceName, scope, VTL_RUNTIME);
  };

  public addAppSyncFunction = (
    name: string,
    mappingTemplate: FunctionRuntimeTemplate,
    dataSourceName: string,
    scope?: Construct,
    runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty,
  ): AppSyncFunctionConfiguration => {
    if (dataSourceName && !Token.isUnresolved(dataSourceName) && !this.dataSources.has(dataSourceName)) {
      throw new Error(`DataSource ${dataSourceName} is missing in the API`);
    }

    // calculate hash of the slot object
    // if the slot exists for the hash, then return same fn else create function
    const dataSource = this.dataSources.get(dataSourceName);
    const hashes = this.getMappingTemplateHash(mappingTemplate);
    const obj: Slot = {
      dataSource: dataSourceName,
      ...hashes,
    };

    const slotHash = hash(obj);
    if (!this.api.disableResolverDeduping && this.appsyncFunctions.has(slotHash)) {
      const appsyncFunction = this.appsyncFunctions.get(slotHash)!;
      // generating duplicate appsync functions vtl files to help in custom overrides
      this.bindMappingTemplate(mappingTemplate, appsyncFunction, this.api.assetProvider, runtime);
      return appsyncFunction;
    }

    // AppSyncFunctionConfiguration is a construct, but no longer creates stack resources. Instead, it only holds the name value in the
    // `name` and `functionId` properties.
    const fn = new AppSyncFunctionConfiguration(scope || this.api, name, {
      api: this.api,
      name,
      dataSource: dataSource || dataSourceName,
      mappingTemplate,
      runtime,
    });

    // TODO: Extend this to work with S3 VTL templates and JS templates
    if (
      isVtlRuntimeTemplate(mappingTemplate) &&
      mappingTemplate.requestMappingTemplate.type === MappingTemplateType.INLINE &&
      mappingTemplate.responseMappingTemplate.type === MappingTemplateType.INLINE
    ) {
      this.resources[name] = {
        type: 'AppSyncVtlFunction',
        functionId: fn.functionId,
        dataSource: dataSource?.name || dataSourceName,
        requestMappingTemplate: mappingTemplate.requestMappingTemplate.bind(scope ?? this.api),
        responseMappingTemplate: mappingTemplate.responseMappingTemplate.bind(scope ?? this.api),
      };
    }

    this.appsyncFunctions.set(slotHash, fn);
    return fn;
  };

  public addJsRuntimeResolver = (
    typeName: string,
    fieldName: string,
    codeMappingTemplate: MappingTemplateProvider,
    resolverLogicalId?: string,
    dataSourceName?: string,
    pipelineConfig?: string[],
    scope?: Construct,
  ): CfnResolver => {
    return this.addResolver(
      typeName,
      fieldName,
      { codeMappingTemplate },
      resolverLogicalId,
      dataSourceName,
      pipelineConfig,
      scope,
      APPSYNC_JS_RUNTIME,
    );
  };

  public addVtlRuntimeResolver = (
    typeName: string,
    fieldName: string,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
    resolverLogicalId?: string,
    dataSourceName?: string,
    pipelineConfig?: string[],
    scope?: Construct,
  ): CfnResolver => {
    return this.addResolver(
      typeName,
      fieldName,
      { requestMappingTemplate, responseMappingTemplate },
      resolverLogicalId,
      dataSourceName,
      pipelineConfig,
      scope,
      VTL_RUNTIME,
    );
  };

  public addResolver = (
    typeName: string,
    fieldName: string,
    mappingTemplate: FunctionRuntimeTemplate,
    resolverLogicalId?: string,
    dataSourceName?: string,
    pipelineConfig?: string[],
    scope?: Construct,
    runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty,
  ): any => {
    if (dataSourceName && !Token.isUnresolved(dataSourceName) && !this.dataSources.has(dataSourceName)) {
      throw new Error(`DataSource ${dataSourceName} is missing in the API`);
    }

    const resolverName = toCamelCase([resourceName(typeName), resourceName(fieldName), 'Resolver']);
    const resourceId = resolverLogicalId ?? ResolverResourceIDs.ResolverResourceID(typeName, fieldName);
    const runtimeSpecificProps = getRuntimeSpecificFunctionProps(this.api, {
      mappingTemplate,
      runtime,
      api: this.api,
    });

    if (dataSourceName) {
      const dataSource = this.dataSources.get(dataSourceName);
      const resolver = new CfnResolver(scope || this.api, resolverName, {
        apiId: this.api.apiId,
        fieldName,
        typeName,
        kind: 'UNIT',
        dataSourceName: dataSource?.ds.attrName || dataSourceName,
        ...runtimeSpecificProps,
      });
      resolver.overrideLogicalId(resourceId);
      setResourceName(resolver, { name: `${typeName}.${fieldName}` });
      this.api.addSchemaDependency(resolver);
      return resolver;
    }

    if (!pipelineConfig) {
      throw new Error('Resolver needs either dataSourceName or pipelineConfig to be passed');
    }

    if (
      isVtlRuntimeTemplate(mappingTemplate) &&
      mappingTemplate.requestMappingTemplate.type === MappingTemplateType.INLINE &&
      mappingTemplate.responseMappingTemplate.type === MappingTemplateType.INLINE
    ) {
      const resolverResource = {
        type: 'PipelineResolver',
        fieldName,
        typeName,
        kind: 'PIPELINE',
        requestMappingTemplate: mappingTemplate.requestMappingTemplate.bind(scope ?? this.api),
        responseMappingTemplate: mappingTemplate.responseMappingTemplate.bind(scope ?? this.api),
        pipelineConfig: {
          functions: pipelineConfig,
        },
      } as const;
      this.resources[`${typeName}.${fieldName}`] = resolverResource;
      return resolverResource;
    } else {
      const resolver = new CfnResolver(scope || this.api, resolverName, {
        apiId: this.api.apiId,
        fieldName,
        typeName,
        kind: 'PIPELINE',
        ...runtimeSpecificProps,
        pipelineConfig: {
          functions: pipelineConfig,
        },
      });
      resolver.overrideLogicalId(resourceId);
      setResourceName(resolver, { name: `${typeName}.${fieldName}` });
      this.api.addSchemaDependency(resolver);
      return resolver;
    }
  };

  addLambdaFunction = (
    functionName: string,
    functionKey: string,
    handlerName: string,
    filePath: string,
    runtime: Runtime,
    layers?: ILayerVersion[],
    role?: IRole,
    environment?: { [key: string]: string },
    timeout?: Duration,
    scope?: Construct,
    vpc?: VpcConfig,
    description?: string,
  ): IFunction => {
    const dummyCode = 'if __name__ == "__main__":'; // assing dummy code so as to be overriden later
    const fn = new Function(scope || this.api, functionName, {
      code: Code.fromInline(dummyCode),
      handler: handlerName,
      runtime,
      role,
      layers,
      environment,
      timeout,
      description,
    });
    fn.addLayers();
    const cfnFn = fn.node.defaultChild as CfnFunction;
    setResourceName(fn, { name: functionName, setOnDefaultChild: true });
    const functionCode = new S3MappingFunctionCode(functionKey, filePath).bind(fn, this.api.assetProvider);
    cfnFn.code = {
      s3Key: functionCode.s3ObjectKey,
      s3Bucket: functionCode.s3BucketName,
    };

    const subnetIds = vpc?.subnetAvailabilityZoneConfig.map((sn) => sn.subnetId);

    if (vpc?.vpcId) {
      cfnFn.vpcConfig = {
        subnetIds: subnetIds,
        securityGroupIds: vpc?.securityGroupIds,
      };
    }

    return fn;
  };

  /**
   * Adds NONE DS to the API
   * @param id The data source's id
   * @param options optional configuration for data source
   * @param scope cdk scope to which this datasource needs to mapped to
   */
  protected doAddNoneDataSource(id: string, options?: DataSourceOptions, scope?: Construct): NoneDataSource {
    const noneDataSource = new NoneDataSource(scope ?? this.api, id, {
      api: this.api,
      name: options?.name,
      description: options?.description,
    });
    setResourceName(noneDataSource, { name: options?.name ?? id, setOnDefaultChild: true });
    return noneDataSource;
  }

  /**
   * add a new DynamoDB data source to this API
   *
   * @param id The data source's id
   * @param table The DynamoDB table backing this data source
   * @param options The optional configuration for this data source
   * @param scope cdk scope to which this datasource needs to mapped to
   */
  protected doAddDynamoDbDataSource(id: string, table: ITable, options?: DynamoDbDataSourceOptions, scope?: Construct): DynamoDbDataSource {
    const ds = new DynamoDbDataSource(scope ?? this.api, id, {
      api: this.api,
      table,
      name: options?.name,
      description: options?.description,
      serviceRole: options?.serviceRole,
    });

    const cfnDataSource: CfnDataSource = (ds as any).node.defaultChild;
    cfnDataSource.overrideLogicalId(id);
    setResourceName(ds, { name: options?.name ?? id, setOnDefaultChild: true });

    return ds;
  }

  /**
   * add a new http data source to this API
   *
   * @param id The data source's id
   * @param endpoint The http endpoint
   * @param options The optional configuration for this data source
   * @param scope cdk scope to which this datasource needs to mapped to
   */
  protected doAddHttpDataSource(id: string, endpoint: string, options?: HttpDataSourceOptions, scope?: Construct): HttpDataSource {
    const ds = new HttpDataSource(scope ?? this.api, id, {
      api: this.api,
      endpoint,
      name: options?.name,
      description: options?.description,
      authorizationConfig: options?.authorizationConfig,
    });

    const cfnDataSource: CfnDataSource = (ds as any).node.defaultChild;
    cfnDataSource.overrideLogicalId(id);
    setResourceName(ds, { name: options?.name ?? id, setOnDefaultChild: true });

    return ds;
  }

  /**
   * add a new searchable data source to this API
   *
   * @param id The data source's id
   * @param endpoint The searchable endpoint
   * @param region The searchable datasource region
   * @param options The optional configuration for this data source
   * @param scope cdk scope to which this datasource needs to mapped to
   */
  protected doAddSearchableDataSource(
    id: string,
    endpoint: string,
    region: string,
    options?: SearchableDataSourceOptions,
    scope?: Construct,
  ): SearchableDataSource {
    const searchableDataSource = new SearchableDataSource(scope ?? this.api, id, {
      api: this.api,
      name: options?.name,
      endpoint,
      region,
      serviceRole: options?.serviceRole,
    });
    setResourceName(searchableDataSource, { name: options?.name ?? id, setOnDefaultChild: true });
    return searchableDataSource;
  }

  /**
   * add a new Lambda data source to this API
   *
   * @param id The data source's id
   * @param lambdaFunction The Lambda function to call to interact with this data source
   * @param options The optional configuration for this data source
   * @param scope cdk scope to which this datasource needs to mapped to
   */
  protected doAddLambdaDataSource(id: string, lambdaFunction: IFunction, options?: DataSourceOptions, scope?: Construct): LambdaDataSource {
    const ds = new LambdaDataSource(scope || this.api, id, {
      api: this.api,
      lambdaFunction,
      name: options?.name,
      description: options?.description,
    });

    const cfnDataSource: CfnDataSource = (ds as any).node.defaultChild;
    cfnDataSource.overrideLogicalId(id);
    setResourceName(ds, { name: options?.name ?? id, setOnDefaultChild: true });

    return ds;
  }

  private getMappingTemplateHash(mappingTemplate: FunctionRuntimeTemplate): Omit<Slot, 'dataSource'> {
    return isJsRuntimeTemplate(mappingTemplate)
      ? { codeMappingTemplate: mappingTemplate.codeMappingTemplate.getTemplateHash() }
      : {
          requestMappingTemplate: mappingTemplate.requestMappingTemplate?.getTemplateHash(),
          responseMappingTemplate: mappingTemplate.responseMappingTemplate?.getTemplateHash(),
        };
  }

  private bindMappingTemplate(
    mappingTemplate: FunctionRuntimeTemplate,
    functionConfiguration: AppSyncFunctionConfiguration,
    assetProvider: AssetProvider,
    runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty,
  ): void {
    if (isJsResolverFnRuntime(runtime)) {
      const { codeMappingTemplate } = mappingTemplate as JSRuntimeTemplate;
      codeMappingTemplate.bind(functionConfiguration, assetProvider);
    } else {
      const { requestMappingTemplate, responseMappingTemplate } = mappingTemplate as VTLRuntimeTemplate;
      requestMappingTemplate && requestMappingTemplate.bind(functionConfiguration, assetProvider);
      responseMappingTemplate && responseMappingTemplate.bind(functionConfiguration, assetProvider);
    }
  }
}

const isJsRuntimeTemplate = (mappingTemplate: FunctionRuntimeTemplate): mappingTemplate is JSRuntimeTemplate => {
  return (mappingTemplate as JSRuntimeTemplate).codeMappingTemplate !== undefined;
};

const isVtlRuntimeTemplate = (mappingTemplate: FunctionRuntimeTemplate): mappingTemplate is VTLRuntimeTemplate => {
  return (
    (mappingTemplate as VTLRuntimeTemplate).requestMappingTemplate !== undefined &&
    (mappingTemplate as VTLRuntimeTemplate).responseMappingTemplate !== undefined
  );
};
