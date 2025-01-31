import {
  AssetProvider,
  DynamoDbDataSourceOptions,
  FunctionRuntimeTemplate,
  JSRuntimeTemplate,
  MappingTemplateProvider,
  SearchableDataSourceOptions,
  TransformHostProvider,
  VpcConfig,
  VTLRuntimeTemplate,
} from '@aws-amplify/graphql-transformer-interfaces';
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as assets from 'aws-cdk-lib/aws-s3-assets';
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
import { Duration, Token } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { ResolverResourceIDs, resourceName, toCamelCase } from 'graphql-transformer-common';
import hash from 'object-hash';
import { Construct } from 'constructs';
import { AppSyncFunctionConfiguration } from './appsync-function';
import { SearchableDataSource } from './cdk-compat/searchable-datasource';
import { S3MappingFunctionCode } from './cdk-compat/template-asset';
import { GraphQLApi } from './graphql-api';
import { setResourceName } from './utils';
import { getRuntimeSpecificFunctionProps, isJsResolverFnRuntime } from './utils/function-runtime';
import { APPSYNC_JS_RUNTIME, VTL_RUNTIME } from './types';
import { Provider } from 'aws-cdk-lib/custom-resources';

type Slot = {
  requestMappingTemplate?: string;
  responseMappingTemplate?: string;
  codeMappingTemplate?: string;
  dataSource?: string;
};

export interface DefaultTransformHostOptions {
  readonly api: GraphQLApi;
}

export class DefaultTransformHost implements TransformHostProvider {
  private dataSources: Map<string, BaseDataSource> = new Map();

  private resolvers: Map<string, CfnResolver> = new Map();

  private appsyncFunctions: Map<string, AppSyncFunctionConfiguration> = new Map();

  private resources: Record<string, any> = {};

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

  createResourceManagerResource = (context: any): void => {
    const customResourceStack = context.stackManager.getScopeFor('ResolverManagerStack', 'ResolverManagerStack');
    const resolverCodeAssetFilePath = path.join(__dirname, 'resolver-manager', 'computed-resources.json');
    fs.writeFileSync(resolverCodeAssetFilePath, JSON.stringify(this.resources, null, 4));
    const resolverCodeAsset = new assets.Asset(customResourceStack, 'ResolverCodeAsset', {
      path: resolverCodeAssetFilePath,
    });

    const lambdaCodePath = path.join(__dirname, '..', 'lib', 'resolver-manager');
    console.log(path.normalize(lambdaCodePath));

    const serviceTokenHandler = new Provider(customResourceStack, 'AmplifyResolverManagerLogicalId', {
      onEventHandler: new Function(this.api, 'AmplifyResolverManagerOnEvent', {
        code: Code.fromAsset(lambdaCodePath),
        handler: 'index.handler',
        runtime: Runtime.NODEJS_18_X,
        environment: {
          API_ID: this.api.apiId,
          resolverCodeAsset: resolverCodeAsset.s3ObjectUrl,
        },
        timeout: Duration.minutes(10),
        initialPolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['appsync:*'],
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
    serviceTokenHandler.node.addDependency(resolverCodeAsset);

    const customResolverManager = new cdk.CustomResource(customResourceStack, 'ResolverManager', {
      resourceType: 'Custom::AmplifyResolverManager',
      serviceToken: serviceTokenHandler.serviceToken,
    });

    this.dataSources.forEach((ds) => {
      customResolverManager.node.addDependency(ds);
      serviceTokenHandler.node.addDependency(ds);
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

    const fn = new AppSyncFunctionConfiguration(scope || this.api, name, {
      api: this.api,
      name,
      dataSource: dataSource || dataSourceName,
      mappingTemplate,
      runtime,
    });
    this.resources[name] = {
      type: 'AppSyncFunction',
      functionId: fn.functionId,
      dataSource: dataSource?.name || dataSourceName,
      requestMappingTemplate: ((mappingTemplate as VTLRuntimeTemplate).requestMappingTemplate as any).content,
      responseMappingTemplate: ((mappingTemplate as VTLRuntimeTemplate).responseMappingTemplate as any).content,
    };
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
    if (pipelineConfig) {
      // const resolver = new CfnResolver(scope || this.api, resolverName, {
      //   apiId: this.api.apiId,
      //   fieldName,
      //   typeName,
      //   kind: 'PIPELINE',
      //   ...(requestMappingTemplate instanceof InlineTemplate
      //     ? { requestMappingTemplate: requestTemplateLocation }
      //     : { requestMappingTemplateS3Location: requestTemplateLocation }),
      //   ...(responseMappingTemplate instanceof InlineTemplate
      //     ? { responseMappingTemplate: responseTemplateLocation }
      //     : { responseMappingTemplateS3Location: responseTemplateLocation }),
      //   pipelineConfig: {
      //     functions: pipelineConfig,
      //   },
      // });

      const resolverResource = {
        type: 'Resolver',
        fieldName,
        typeName,
        kind: 'PIPELINE',
        requestMappingTemplate: ((mappingTemplate as VTLRuntimeTemplate).requestMappingTemplate as any).content,
        responseMappingTemplate: ((mappingTemplate as VTLRuntimeTemplate).responseMappingTemplate as any).content,
        pipelineConfig: {
          functions: pipelineConfig,
        },
      };

      this.resources[`${typeName}.${fieldName}`] = resolverResource;
      return resolverResource;

      // resolver.overrideLogicalId(resourceId);
      // setResourceName(resolver, { name: `${typeName}.${fieldName}` });
      // this.api.addSchemaDependency(resolver);
      // this.resolvers.set(`${typeName}:${fieldName}`, resolver);
      // return resolver;
    }
    throw new Error('Resolver needs either dataSourceName or pipelineConfig to be passed');
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
    const isJsRuntimeTemplate = (mappingTemplate: FunctionRuntimeTemplate): mappingTemplate is JSRuntimeTemplate => {
      return (mappingTemplate as JSRuntimeTemplate).codeMappingTemplate !== undefined;
    };

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
