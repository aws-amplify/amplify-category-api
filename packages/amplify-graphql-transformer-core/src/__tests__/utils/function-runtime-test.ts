import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { getRuntimeSpecificFunctionProps } from '../../utils/function-runtime';
import { App, Stack } from 'aws-cdk-lib';
import { GraphQLApi } from '../../graphql-api';
import { AssetProvider } from '../../../../amplify-graphql-api-construct/src/internal';

describe('Function Runtime Util Tests', () => {
  const app = new App();
  const stack = new Stack(app, 'test-root-stack');
  const api = new GraphQLApi(stack, 'testId', { name: 'testApiName', assetProvider: new AssetProvider(stack) });

  describe('APPSYNC_JS runtime', () => {
    const runtime = { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' };
    const code = `
    export function request(ctx) {
        return {};
    }

     export function response(ctx) {
        return {};
    }`;

    it('should return runtime and code for inline template', () => {
      const codeMappingTemplate = MappingTemplate.inlineTemplateFromString(code);
      const mappingTemplate = { codeMappingTemplate };
      const props = { mappingTemplate, runtime, api };

      const runtimeSpecificProps = getRuntimeSpecificFunctionProps(stack, props);
      expect(runtimeSpecificProps).toEqual({
        runtime,
        code,
      });
    });

    it('should return runtime and codeS3Location for S3 mapping template', () => {
      const codeMappingTemplate = MappingTemplate.s3MappingTemplateFromString(code, 'test-template');
      const mappingTemplate = { codeMappingTemplate };
      const props = { mappingTemplate, runtime, api };

      const { runtime: receivedRuntime, codeS3Location } = getRuntimeSpecificFunctionProps(stack, props);
      expect(runtime).toEqual(receivedRuntime);
      expect(codeS3Location).toBeDefined();
    });
  });

  it('should return the correct CfnFunctionConfiguration props for default (VTL) runtime', () => {
    const request = '$util.toJson({})';
    const response = '$util.toJson({})';

    const mappingTemplate = {
      requestMappingTemplate: MappingTemplate.inlineTemplateFromString(request),
      responseMappingTemplate: MappingTemplate.inlineTemplateFromString(response),
    };

    const props = {
      mappingTemplate,
      api,
    };

    const runtimeSpecificProps = getRuntimeSpecificFunctionProps(stack, props);
    expect(runtimeSpecificProps.runtime).toBeUndefined();
    expect(runtimeSpecificProps).toEqual({
      requestMappingTemplateS3Location: request,
      responseMappingTemplateS3Location: response,
    });
  });
});
