import { AppSyncExecutionStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import {
  BackedDataSource,
  BaseDataSource,
  CfnFunctionConfiguration,
} from '@aws-cdk/aws-appsync';
import { Construct } from '@aws-cdk/core';
import { GraphQLApi } from './graphql-api';
import { getStrategyProps } from './utils/execution-strategy-utils';

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

  private function: CfnFunctionConfiguration;

  constructor(scope: Construct, id: string, props: FunctionConfigurationProps) {
    super(scope, id);

    this.function = new CfnFunctionConfiguration(this, `${id}.AppSyncFunction`, {
      name: id,
      apiId: props.api.apiId,
      functionVersion: '2018-05-29',
      description: props.description,
      dataSourceName: props.dataSource instanceof BaseDataSource ? props.dataSource.ds.attrName : props.dataSource,
      ...getStrategyProps(this, props.strategy),
    });

    this.arn = this.function.attrFunctionArn;
    this.functionId = this.function.attrFunctionId;

    props.api.addSchemaDependency(this.function);
    if (props.dataSource instanceof BackedDataSource) {
      this.function.addDependsOn(props.dataSource?.ds);
    }
  }
}
