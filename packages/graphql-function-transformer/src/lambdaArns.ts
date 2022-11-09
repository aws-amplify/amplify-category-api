import { Fn } from 'cloudform-types';
import { ResourceConstants } from 'graphql-transformer-common';

export function lambdaArnResource(name: string, region?: string, accountId?:string) {
  const substitutions = {};
  if (referencesEnv(name)) {
    substitutions['env'] = Fn.Ref(ResourceConstants.PARAMETERS.Env);
  }
  return Fn.If(
    ResourceConstants.CONDITIONS.HasEnvironmentParameter,
    Fn.Sub(lambdaArnKey(name, region, accountId), substitutions),
    Fn.Sub(lambdaArnKey(removeEnvReference(name), region, accountId), {})
  );
}

export function lambdaArnKey(name: string, region?: string, accountId?:string) {
  const regionSubstr: string = region ? region : '${AWS::Region}';
  const accountIdSubstr: string = accountId ? accountId : '${AWS::AccountId}';
  return `arn:aws:lambda:${regionSubstr}:${accountIdSubstr}:function:${name}`;
}

function referencesEnv(value: string) {
  return value.match(/(\${env})/) !== null;
}

function removeEnvReference(value: string) {
  return value.replace(/(-\${env})/, '');
}
