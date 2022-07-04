import { Fn, Refs } from 'cloudform-types';
import { FunctionDirectiveConfig, ResourceConstants } from 'graphql-transformer-common';

export function lambdaArnResource(fdConfig: FunctionDirectiveConfig) {
  const substitutions = {};
  if (referencesEnv(fdConfig.name)) {
    substitutions['env'] = Fn.Ref(ResourceConstants.PARAMETERS.Env);
  }
  return Fn.If(
    ResourceConstants.CONDITIONS.HasEnvironmentParameter,
    Fn.Sub(lambdaArnKey(fdConfig), substitutions),
    Fn.Sub(lambdaArnKey({
      ...fdConfig,
      name: removeEnvReference(fdConfig.name),
    }), {})
  );
}

export function lambdaArnKey({ name, region, accountId }: FunctionDirectiveConfig) {
  const regionSubstr: string = region ?? '${AWS::Region}';
  const accountIdSubstr: string = accountId ?? '${AWS::AccountId}';
  return `arn:aws:lambda:${regionSubstr}:${accountIdSubstr}:function:${name}`;
}

function referencesEnv(value: string) {
  return value.match(/(\${env})/) !== null;
}

function removeEnvReference(value: string) {
  return value.replace(/(-\${env})/, '');
}
