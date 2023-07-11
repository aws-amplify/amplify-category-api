import {
  DynamoDbDataSourceOptions,
  MappingTemplateProvider,
  SearchableDataSourceOptions,
  TransformHostProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import {
  BaseDataSource,
  DataSourceOptions,
  DynamoDbDataSource,
  ElasticsearchDataSource,
  HttpDataSource,
  HttpDataSourceOptions,
  LambdaDataSource,
  NoneDataSource,
} from 'aws-cdk-lib/aws-appsync';
import { CfnResolver } from 'aws-cdk-lib/aws-appsync';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { CfnFunction, Code, Function, IFunction, ILayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Duration, Token } from 'aws-cdk-lib';
import { ResolverResourceIDs, resourceName, toCamelCase } from 'graphql-transformer-common';
import hash from 'object-hash';
import { IDomain } from 'aws-cdk-lib/aws-elasticsearch';
import { Construct } from 'constructs';
// eslint-disable-next-line import/no-cycle
import { AppSyncFunctionConfiguration } from './appsync-function';
import { InlineTemplate, S3MappingFunctionCode } from './cdk-compat';
import { GraphQLApi } from './graphql-api';

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
    if (this.hasDataSource(name)) {
      return this.dataSources.get(name);
    }
  };

  public hasResolver = (typeName: string, fieldName: string): boolean => this.resolvers.has(`${typeName}:${fieldName}`);

  public getResolver = (typeName: string, fieldName: string): CfnResolver | void => {
    if (this.resolvers.has(`${typeName}:${fieldName}`)) {
      return this.resolvers.get(`${typeName}:${fieldName}`);
    }
  };

  addElasticSearchDataSource(
    name: string,
    domain: IDomain,
    options?: SearchableDataSourceOptions,
    scope?: Construct,
  ): ElasticsearchDataSource {
    if (this.dataSources.has(name)) {
      throw new Error(`DataSource ${name} already exists in the API`);
    }
    const dataSource = new ElasticsearchDataSource(scope ?? this.api, name, {
      api: this.api,
      name: options?.name,
      domain,
      serviceRole: options?.serviceRole,
    });

    this.dataSources.set(options?.name || name, dataSource);
    return dataSource;
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
      requestMappingTemplate.bind(appsyncFunction);
      responseMappingTemplate.bind(appsyncFunction);
      return appsyncFunction;
    }

    const fn = new AppSyncFunctionConfiguration(scope || this.api, name, {
      api: this.api,
      dataSource: dataSource || dataSourceName,
      requestMappingTemplate,
      responseMappingTemplate,
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
  ): CfnResolver => {
    if (dataSourceName && !Token.isUnresolved(dataSourceName) && !this.dataSources.has(dataSourceName)) {
      throw new Error(`DataSource ${dataSourceName} is missing in the API`);
    }

    const requestTemplateLocation = requestMappingTemplate.bind(this.api);
    const responseTemplateLocation = responseMappingTemplate.bind(this.api);
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
      this.api.addSchemaDependency(resolver);
      return resolver;
    }
    if (pipelineConfig) {
      const resolver = new CfnResolver(scope || this.api, resolverName, {
        apiId: this.api.apiId,
        fieldName,
        typeName,
        kind: 'PIPELINE',
        ...(requestMappingTemplate instanceof InlineTemplate
          ? { requestMappingTemplate: requestTemplateLocation }
          : { requestMappingTemplateS3Location: requestTemplateLocation }),
        ...(responseMappingTemplate instanceof InlineTemplate
          ? { responseMappingTemplate: responseTemplateLocation }
          : { responseMappingTemplateS3Location: responseTemplateLocation }),
        pipelineConfig: {
          functions: pipelineConfig,
        },
      });
      resolver.overrideLogicalId(resourceId);
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
    });
    fn.addLayers();
    const functionCode = new S3MappingFunctionCode(functionKey, filePath).bind(fn);
    (fn.node.defaultChild as CfnFunction).code = {
      s3Key: functionCode.s3ObjectKey,
      s3Bucket: functionCode.s3BucketName,
    };
    return fn;
  };

  protected doAddNoneDataSource(id: string, options?: DataSourceOptions, scope?: Construct): NoneDataSource {
    return new NoneDataSource(scope ?? this.api, id, {
      api: this.api,
      name: options?.name,
      description: options?.description,
    });
  }

  /**
   * add a new DynamoDB data source to this API
   *
   * @param id The data source's id
   * @param table The DynamoDB table backing this data source
   * @param options The optional configuration for this data source
   * @param scope  Stack to which this datasource needs to mapped to
   */
  protected doAddDynamoDbDataSource(id: string, table: ITable, options?: DynamoDbDataSourceOptions, scope?: Construct): DynamoDbDataSource {
    const ds = new DynamoDbDataSource(scope ?? this.api, id, {
      api: this.api,
      table,
      name: options?.name,
      description: options?.description,
      serviceRole: options?.serviceRole,
    });

    (ds as any).node.defaultChild.overrideLogicalId(id);

    return ds;
  }

  /**
   * add a new http data source to this API
   *
   * @param id The data source's id
   * @param endpoint The http endpoint
   * @param options The optional configuration for this data source
   * @param scope Stack to which the http datasource needs to be created in
   */
  protected doAddHttpDataSource(id: string, endpoint: string, options?: HttpDataSourceOptions, scope?: Construct): HttpDataSource {
    const ds = new HttpDataSource(scope ?? this.api, id, {
      api: this.api,
      endpoint,
      name: options?.name,
      description: options?.description,
      authorizationConfig: options?.authorizationConfig,
    });

    (ds as any).node.defaultChild.overrideLogicalId(id);

    return ds;
  }

  /**
   * add a new Lambda data source to this API
   *
   * @param id The data source's id
   * @param lambdaFunction The Lambda function to call to interact with this data source
   * @param options The optional configuration for this data source
   */
  protected doAddLambdaDataSource(id: string, lambdaFunction: IFunction, options?: DataSourceOptions, scope?: Construct): LambdaDataSource {
    const ds = new LambdaDataSource(scope || this.api, id, {
      api: this.api,
      lambdaFunction,
      name: options?.name,
      description: options?.description,
    });

    (ds as any).node.defaultChild.overrideLogicalId(id);

    return ds;
  }
}
