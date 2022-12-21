import {
  AppSyncCodeExecutionStrategy,
  AppSyncExecutionStrategy,
  AppSyncTemplateExecutionStrategy,
} from "@aws-amplify/graphql-transformer-interfaces";
import { CfnResolverProps } from "@aws-cdk/aws-appsync";
import { Construct } from "@aws-cdk/core";
import { InlineTemplate } from "../cdk-compat";

type CfnResolverStrategyProps =
  | Pick<
    CfnResolverProps,
    | 'requestMappingTemplate'
    | 'requestMappingTemplateS3Location'
    | 'responseMappingTemplate'
    | 'responseMappingTemplateS3Location'
  >
  | Pick<
    CfnResolverProps,
    | 'code'
    | 'codeS3Location'
    | 'runtime'
  >;

export const getStrategyProps = (scope: Construct, strategy: AppSyncExecutionStrategy): CfnResolverStrategyProps => {
  const requestTemplateLocation = (strategy as AppSyncTemplateExecutionStrategy).requestMappingTemplate?.bind(scope);
  const responseTemplateLocation = (strategy as AppSyncTemplateExecutionStrategy).responseMappingTemplate?.bind(scope);
  const codeLocation = (strategy as AppSyncCodeExecutionStrategy).code?.bind(scope);

  switch (strategy.type) {
    case 'TEMPLATE':
      return {
        ...(strategy.requestMappingTemplate instanceof InlineTemplate
          ? { requestMappingTemplate: requestTemplateLocation }
          : { requestMappingTemplateS3Location: requestTemplateLocation }),
        ...(strategy.responseMappingTemplate instanceof InlineTemplate
          ? { responseMappingTemplate: responseTemplateLocation }
          : { responseMappingTemplateS3Location: responseTemplateLocation }),
      };
    case 'CODE': {
      return {
        ...(strategy.code instanceof InlineTemplate
          ? { code: codeLocation }
          : { codeS3Location: codeLocation }),
        runtime: strategy.runtime,
      };
    }
  }
};