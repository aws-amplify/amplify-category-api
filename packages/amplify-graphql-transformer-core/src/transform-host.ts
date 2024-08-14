import {
  DynamoDbDataSourceOptions,
  MappingTemplateProvider,
  SearchableDataSourceOptions,
  TransformHostProvider,
  VpcConfig,
} from '@aws-amplify/graphql-transformer-interfaces';
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
import { IRole } from 'aws-cdk-lib/aws-iam';
import { CfnFunction, Code, Function, IFunction, ILayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Duration, Token } from 'aws-cdk-lib';
import { ResolverResourceIDs, resourceName, toCamelCase } from 'graphql-transformer-common';
import hash from 'object-hash';
import { Construct } from 'constructs';
import { AppSyncFunctionConfiguration } from './appsync-function';
import { SearchableDataSource } from './cdk-compat/searchable-datasource';
import { InlineTemplate, S3MappingFunctionCode } from './cdk-compat/template-asset';
import { GraphQLApi } from './graphql-api';
import { setResourceName } from './utils';

type Slot = {
  requestMappingTemplate?: string;
  responseMappingTemplate?: string;
  dataSource?: string;
};

export interface DefaultTransformHostOptions {
  readonly api: GraphQLApi;
}

export class DefaultTransformHost implements TransformHostProvider {
  private dataSources: Map<string, BaseDataSource> = new Map();

  private resolvers: Map<string, CfnResolver> = new Map();

  private appsyncFunctions: Map<string, AppSyncFunctionConfiguration> = new Map();

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

  public addAppSyncFunction = (
    name: string,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
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

    const obj: Slot = {
      dataSource: dataSourceName,
      requestMappingTemplate: requestMappingTemplate.getTemplateHash(),
      responseMappingTemplate: responseMappingTemplate.getTemplateHash(),
    };

    const slotHash = hash(obj);
    if (!this.api.disableResolverDeduping && this.appsyncFunctions.has(slotHash)) {
      const appsyncFunction = this.appsyncFunctions.get(slotHash)!;
      // generating duplicate appsync functions vtl files to help in custom overrides
      requestMappingTemplate.bind(appsyncFunction, this.api.assetProvider);
      responseMappingTemplate.bind(appsyncFunction, this.api.assetProvider);
      return appsyncFunction;
    }

    const fn = new AppSyncFunctionConfiguration(scope || this.api, name, {
      api: this.api,
      dataSource: dataSource || dataSourceName,
      requestMappingTemplate,
      responseMappingTemplate,
      runtime,
    });
    this.appsyncFunctions.set(slotHash, fn);
    return fn;
  };

  public addResolver = (
    typeName: string,
    fieldName: string,
    requestMappingTemplate: MappingTemplateProvider,
    responseMappingTemplate: MappingTemplateProvider,
    resolverLogicalId?: string,
    dataSourceName?: string,
    pipelineConfig?: string[],
    scope?: Construct,
    runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty,
  ): CfnResolver => {
    if (dataSourceName && !Token.isUnresolved(dataSourceName) && !this.dataSources.has(dataSourceName)) {
      throw new Error(`DataSource ${dataSourceName} is missing in the API`);
    }

    const requestTemplateLocation = requestMappingTemplate.bind(this.api, this.api.assetProvider);
    const responseTemplateLocation = responseMappingTemplate.bind(this.api, this.api.assetProvider);
    const resolverName = toCamelCase([resourceName(typeName), resourceName(fieldName), 'Resolver']);
    const resourceId = resolverLogicalId ?? ResolverResourceIDs.ResolverResourceID(typeName, fieldName);

    if (dataSourceName) {
      const dataSource = this.dataSources.get(dataSourceName);
      const resolver = new CfnResolver(scope || this.api, resolverName, {
        apiId: this.api.apiId,
        fieldName,
        typeName,
        kind: 'UNIT',
        dataSourceName: dataSource?.ds.attrName || dataSourceName,
        ...(requestMappingTemplate instanceof InlineTemplate
          ? { requestMappingTemplate: requestTemplateLocation }
          : { requestMappingTemplateS3Location: requestTemplateLocation }),
        ...(responseMappingTemplate instanceof InlineTemplate
          ? { responseMappingTemplate: responseTemplateLocation }
          : { responseMappingTemplateS3Location: responseTemplateLocation }),
      });
      resolver.overrideLogicalId(resourceId);
      setResourceName(resolver, { name: `${typeName}.${fieldName}` });
      this.api.addSchemaDependency(resolver);
      return resolver;
    }
    if (pipelineConfig) {
      const runtimeSpecificArgs =
        runtime?.name === 'APPSYNC_JS'
          ? {
              code: requestTemplateLocation + '\n\n' + responseTemplateLocation,
              runtime,
            }
          : {
              ...(requestMappingTemplate instanceof InlineTemplate
                ? { requestMappingTemplate: requestTemplateLocation }
                : { requestMappingTemplateS3Location: requestTemplateLocation }),
              ...(responseMappingTemplate instanceof InlineTemplate
                ? { responseMappingTemplate: responseTemplateLocation }
                : { responseMappingTemplateS3Location: responseTemplateLocation }),
            };

      const resolver = new CfnResolver(scope || this.api, resolverName, {
        apiId: this.api.apiId,
        fieldName,
        typeName,
        kind: 'PIPELINE',
        pipelineConfig: {
          functions: pipelineConfig,
        },
        ...runtimeSpecificArgs,
      });

      resolver.overrideLogicalId(resourceId);
      setResourceName(resolver, { name: `${typeName}.${fieldName}` });
      this.api.addSchemaDependency(resolver);
      this.resolvers.set(`${typeName}:${fieldName}`, resolver);
      return resolver;
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
}
