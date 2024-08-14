import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { BackedDataSource, BaseDataSource, CfnFunctionConfiguration } from 'aws-cdk-lib/aws-appsync';
import { Construct } from 'constructs';
import { InlineTemplate } from './cdk-compat/template-asset';
import { GraphQLApi } from './graphql-api';
import { setResourceName } from './utils';

export interface BaseFunctionConfigurationProps {
  /**
   * The request mapping template for this resolver
   *
   * @default - No mapping template
   */
  readonly requestMappingTemplate: MappingTemplateProvider;
  /**
   * The response mapping template for this resolver
   *
   * @default - No mapping template
   */
  readonly responseMappingTemplate: MappingTemplateProvider;

  readonly description?: string;
}

/**
 * Additional properties for an AppSync resolver like GraphQL API reference and datasource
 */
export interface FunctionConfigurationProps extends BaseFunctionConfigurationProps {
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

  /**
   * Describes a runtime used by an AWS AppSync resolver or AWS AppSync function.
   *
   * Specifies the name and version of the runtime to use. Note that if a runtime is specified, code must also be specified.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-appsync-functionconfiguration.html#cfn-appsync-functionconfiguration-runtime
   */
  readonly runtime: CfnFunctionConfiguration.AppSyncRuntimeProperty | undefined;
}

export class AppSyncFunctionConfiguration extends Construct {
  /**
   * the ARN of the resolver
   */
  public readonly arn: string;

  public readonly functionId: string;

  private function: CfnFunctionConfiguration;

  constructor(scope: Construct, id: string, props: FunctionConfigurationProps) {
    super(scope, id);

    const requestTemplate = props.requestMappingTemplate.bind(this, props.api.assetProvider);
    const responseTemplate = props.responseMappingTemplate.bind(this, props.api.assetProvider);
    this.function =
      props.runtime?.name === 'APPSYNC_JS'
        ? new CfnFunctionConfiguration(this, `${id}.AppSyncFunction`, {
            name: id,
            apiId: props.api.apiId,
            functionVersion: '2018-05-29',
            description: props.description,
            dataSourceName: props.dataSource instanceof BaseDataSource ? props.dataSource.ds.attrName : props.dataSource,
            code: requestTemplate + '\n\n' + responseTemplate,
            runtime: props.runtime,
          })
        : new CfnFunctionConfiguration(this, `${id}.AppSyncFunction`, {
            name: id,
            apiId: props.api.apiId,
            functionVersion: '2018-05-29',
            description: props.description,
            dataSourceName: props.dataSource instanceof BaseDataSource ? props.dataSource.ds.attrName : props.dataSource,
            ...(props.requestMappingTemplate instanceof InlineTemplate
              ? { requestMappingTemplate: requestTemplate }
              : { requestMappingTemplateS3Location: requestTemplate }),
            ...(props.responseMappingTemplate instanceof InlineTemplate
              ? { responseMappingTemplate: responseTemplate }
              : { responseMappingTemplateS3Location: responseTemplate }),
          });
    setResourceName(this.function, { name: id });
    props.api.addSchemaDependency(this.function);
    if (props.dataSource instanceof BackedDataSource) {
      this.function.addDependency(props.dataSource?.ds);
    }
    this.arn = this.function.attrFunctionArn;
    this.functionId = this.function.attrFunctionId;
  }
}
