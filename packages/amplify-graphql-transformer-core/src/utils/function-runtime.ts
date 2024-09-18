import {
  FunctionRuntimeTemplate,
  JSRuntimeTemplate,
  MappingTemplateProvider,
  MappingTemplateType,
  VTLRuntimeTemplate,
} from '@aws-amplify/graphql-transformer-interfaces';
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
  /** The S3 location of the function code. Used for JavaScript runtimes with S3-stored templates. */
  codeS3Location?: string;
};

/**
 * Retrieves the runtime-specific function properties based on the provided configuration.
 *
 * @param scope - The construct scope.
 * @param props - An object containing the function configuration properties.
 * @param props.mappingTemplate - The function runtime template, either JSRuntimeTemplate or VTLRuntimeTemplate.
 * @param props.runtime - AppSync resolver function runtime configuration.
 * @param props.api - The GraphQL API instance.
 * @returns An object with runtime-specific function properties.
 */
export const getRuntimeSpecificFunctionProps = (
  scope: Construct,
  props: {
    mappingTemplate: FunctionRuntimeTemplate;
    runtime?: CfnFunctionConfiguration.AppSyncRuntimeProperty;
    api: GraphQLApi;
  },
): RuntimeSpecificFunctionProps => {
  const { mappingTemplate, runtime, api } = props;

  if (isJsResolverFnRuntime(runtime)) {
    const { codeMappingTemplate } = mappingTemplate as JSRuntimeTemplate;
    if (!codeMappingTemplate) {
      throw new Error('codeMappingTemplate is required for JavaScript resolver function runtimes');
    }
    const codeTemplateLocation = codeMappingTemplate.bind(scope, api.assetProvider);
    return codeMappingTemplate.type === MappingTemplateType.INLINE
      ? { runtime, code: codeTemplateLocation }
      : { runtime, codeS3Location: codeTemplateLocation };
  }

  const { requestMappingTemplate, responseMappingTemplate } = mappingTemplate as VTLRuntimeTemplate;
  const requestTemplateLocation = requestMappingTemplate?.bind(scope, api.assetProvider);
  const responseTemplateLocation = responseMappingTemplate?.bind(scope, api.assetProvider);
  return {
    ...(requestMappingTemplate instanceof InlineTemplate
      ? { requestMappingTemplate: requestTemplateLocation }
      : { requestMappingTemplateS3Location: requestTemplateLocation }),
    ...(responseMappingTemplate instanceof InlineTemplate
      ? { responseMappingTemplate: responseTemplateLocation }
      : { responseMappingTemplateS3Location: responseTemplateLocation }),
  };
};
