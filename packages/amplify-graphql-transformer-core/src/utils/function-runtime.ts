import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { CfnFunctionConfiguration } from 'aws-cdk-lib/aws-appsync';
import { GraphQLApi } from '../graphql-api';
import { InlineTemplate } from '../cdk-compat';
import { Construct } from 'constructs';

type RuntimeSpecificFunctionProps = {
  requestMappingTemplate?: string;
  responseMappingTemplate?: string;
  requestMappingTemplateS3Location?: string;
  responseMappingTemplateS3Location?: string;
  runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty;
  code?: string;
};

export const getRuntimeSpecificFunctionProps = (
  scope: Construct,
  props: {
    requestMappingTemplate: MappingTemplateProvider;
    responseMappingTemplate: MappingTemplateProvider;
    runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty;
    api: GraphQLApi;
  },
): RuntimeSpecificFunctionProps => {
  const { requestMappingTemplate, responseMappingTemplate, runtime, api } = props;

  const requestTemplateLocation = requestMappingTemplate.bind(scope, api.assetProvider);
  const responseTemplateLocation = responseMappingTemplate.bind(scope, api.assetProvider);

  if (runtime?.name === 'APPSYNC_JS') {
    return {
      runtime,
      code: requestTemplateLocation + '\n\n' + responseTemplateLocation,
    };
  }

  return {
    ...(requestMappingTemplate instanceof InlineTemplate
      ? { requestMappingTemplate: requestTemplateLocation }
      : { requestMappingTemplateS3Location: requestTemplateLocation }),
    ...(responseMappingTemplate instanceof InlineTemplate
      ? { responseMappingTemplate: responseTemplateLocation }
      : { responseMappingTemplateS3Location: responseTemplateLocation }),
  };
};
