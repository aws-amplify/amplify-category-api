import { MappingTemplateProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { CfnFunctionConfiguration } from 'aws-cdk-lib/aws-appsync';
import { GraphQLApi } from '../graphql-api';
import { InlineTemplate } from '../cdk-compat';
import { Construct } from 'constructs';

/**
 * Checks if the given runtime is a JavaScript resolver function runtime.
 * @param runtime - The AppSync runtime configuration.
 * @returns True if the runtime is JavaScript, false otherwise.
 */
export const isJsResolverFnRuntime = (runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty): boolean => runtime?.name === 'APPSYNC_JS';

/**
 * Represents the runtime-specific properties for an AppSync function.
 */
type RuntimeSpecificFunctionProps = {
  /** The request mapping template as a string. Used for VTL runtimes. */
  requestMappingTemplate?: string;
  /** The response mapping template as a string. Used for VTL runtimes. */
  responseMappingTemplate?: string;
  /** The S3 location of the request mapping template. Used for VTL runtimes with S3-stored templates. */
  requestMappingTemplateS3Location?: string;
  /** The S3 location of the response mapping template. Used for VTL runtimes with S3-stored templates. */
  responseMappingTemplateS3Location?: string;
  /** The AppSync runtime configuration. */
  runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty;
  /** The function code as a string. Used for JavaScript runtimes. */
  code?: string;
};

/**
 * Retrieves the runtime-specific function properties based on the provided configuration.
 *
 * @param scope - The construct scope.
 * @param props - An object containing the function configuration properties.
 * @param props.requestMappingTemplate - The request mapping template provider.
 * @param props.responseMappingTemplate - The response mapping template provider.
 * @param props.runtime - AppSync resolver function runtime configuration.
 * @param props.api - The GraphQL API instance.
 * @returns An object with runtime-specific function properties.
 */
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

  if (isJsResolverFnRuntime(runtime)) {
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
