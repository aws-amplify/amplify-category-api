import { BackedDataSource, BaseDataSource, CfnFunctionConfiguration } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import { AppSyncExecutionStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { CfnResource } from 'aws-cdk-lib';
import { InlineTemplate } from './cdk-compat/template-asset';
import { GraphQLApi } from './graphql-api';

/**
 * Additional properties for an AppSync resolver like GraphQL API reference and datasource
 */
type FunctionConfigurationProps = {
  /**
   * Resolvers and code for the given function.
   */
  readonly strategy: AppSyncExecutionStrategy;

  /**
   * The API this resolver is attached to
   */
  readonly api: GraphQLApi;

  /**
  * The data source this resolver is using
  *
  * @default - No datasource
  */
  readonly dataSource: BaseDataSource | string;

  readonly description?: string;
};

export class AppSyncFunctionConfiguration extends Construct {
  /**
   * the ARN of the resolver
   */
  public readonly arn: string;
  public readonly functionId: string;

  private function: CfnFunctionConfiguration | CfnResource;

  constructor(scope: Construct, id: string, props: FunctionConfigurationProps) {
    super(scope, id);

    this.function = this.generateFunction(id, props);

    props.api.addSchemaDependency(this.function);
    if (props.dataSource instanceof BackedDataSource) {
      this.function.addDependency(props.dataSource?.ds);
    }

    this.arn = this.getFunctionArn();
    this.functionId = this.getFunctionId();
  }

  private getFunctionArn = (): string => {
    if (this.function instanceof CfnFunctionConfiguration) {
      return this.function.attrFunctionArn;
    }

    return this.function.getAtt('FunctionArn').toString();
  };

  private getFunctionId = (): string => {
    if (this.function instanceof CfnFunctionConfiguration) {
      return this.function.attrFunctionId;
    }

    return this.function.getAtt('FunctionId').toString();
  };

  generateFunction(id: string, props: FunctionConfigurationProps): CfnFunctionConfiguration | CfnResource {
    switch (props.strategy.type) {
      case 'TEMPLATE':
        return this.generateTemplateFunction(id, props);
      case 'CODE':
        return this.generateCodeFunction(id, props);
    }
  }

  generateTemplateFunction(id: string, props: FunctionConfigurationProps): CfnFunctionConfiguration {
    if (props.strategy.type !== 'TEMPLATE') {
      throw new Error(`Expected strategy with type TEMPLATE, got ${props.strategy.type}`);
    }
    const requestTemplate = props.strategy.requestMappingTemplate?.bind(this);
    const responseTemplate = props.strategy.responseMappingTemplate?.bind(this);

    return new CfnFunctionConfiguration(this, `${id}.AppSyncFunction`, {
      name: id,
      apiId: props.api.apiId,
      functionVersion: '2018-05-29',
      description: props.description,
      dataSourceName: props.dataSource instanceof BaseDataSource ? props.dataSource.ds.attrName : props.dataSource,
      ...(props.strategy.requestMappingTemplate instanceof InlineTemplate
        ? { requestMappingTemplate: requestTemplate }
        : { requestMappingTemplateS3Location: requestTemplate }),
      ...(props.strategy.responseMappingTemplate instanceof InlineTemplate
        ? { responseMappingTemplate: responseTemplate }
        : { responseMappingTemplateS3Location: responseTemplate }),
    });
  }

  generateCodeFunction(id: string, props: FunctionConfigurationProps): CfnResource {
    if (props.strategy.type !== 'CODE') {
      throw new Error(`Expected strategy with type CODE, got ${props.strategy.type}`);
    }

    const code = props.strategy.code.bind(this);

    return new CfnResource(this, `${id}.AppSyncFunctinon`, {
      type: 'AWS::AppSync::FunctionConfiguration',
      properties: {
        ApiId: props.api.apiId,
        ...(props.strategy.code instanceof InlineTemplate
          ? { Code: code }
          : { CodeS3Location: code }),
        DataSourceName: props.dataSource instanceof BaseDataSource ? props.dataSource.ds.attrName : props.dataSource,
        Name: id,
        Runtime: {
          Name: props.strategy.runtime.name,
          RuntimeVersion: props.strategy.runtime.runtimeVersion,
        },
      },
    });
  }
}
