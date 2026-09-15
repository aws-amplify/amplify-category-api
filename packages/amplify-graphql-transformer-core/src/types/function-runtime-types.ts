import { CfnFunctionConfiguration } from 'aws-cdk-lib/aws-appsync';

export const APPSYNC_JS_RUNTIME: CfnFunctionConfiguration.AppSyncRuntimeProperty = { name: 'APPSYNC_JS', runtimeVersion: '1.0.0' };
export const VTL_RUNTIME: CfnFunctionConfiguration.AppSyncRuntimeProperty | undefined = undefined;
