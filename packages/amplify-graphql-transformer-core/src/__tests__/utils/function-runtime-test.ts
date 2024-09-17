import { MappingTemplate } from '@aws-amplify/graphql-transformer-core';
import { getRuntimeSpecificFunctionProps } from '../../utils/function-runtime';
import { App, Stack } from 'aws-cdk-lib';
import { GraphQLApi } from '../../graphql-api';
import { AssetProvider } from '../../../../amplify-graphql-api-construct/src/internal';

describe('Function Runtime Util Tests', () => {
  const app = new App();
  const stack = new Stack(app, 'test-root-stack');
  const api = new GraphQLApi(stack, 'testId', { name: 'testApiName', assetProvider: new AssetProvider(stack) });

  it('should return the correct CfnFunctionConfiguration props for APPSYNC_JS runtime', () => {
    const request = `
        export function request(ctx) {
            return {}
        }
    `;

    const response = `
        export function response(ctx) {
            return {}
        }
    `;
    const requestMappingTemplate = MappingTemplate.inlineTemplateFromString(request);
    const responseMappingTemplate = MappingTemplate.inlineTemplateFromString(response);

    const props = {
      requestMappingTemplate,
      responseMappingTemplate,
      runtime: { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' },
      api,
    };

    const runtimeSpecificProps = getRuntimeSpecificFunctionProps(stack, props);
    expect(runtimeSpecificProps).toEqual({
      runtime: { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' },
      code: request + '\n\n' + response,
    });
  });

  it('should return the correct CfnFunctionConfiguration props for default (VTL) runtime', () => {
    const request = '$util.toJson({})';
    const response = '$util.toJson({})';

    const requestMappingTemplate = MappingTemplate.inlineTemplateFromString(request);
    const responseMappingTemplate = MappingTemplate.inlineTemplateFromString(response);

    const props = {
      requestMappingTemplate,
      responseMappingTemplate,
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
