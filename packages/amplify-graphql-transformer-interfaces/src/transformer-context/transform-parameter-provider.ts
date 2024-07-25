import { CfnParameter } from 'aws-cdk-lib';

/**
 * Provider in order to facilitate existing 3p transformers which may depend on `env` parameters, for example.
 */
export interface TransformParameterProvider {
  provide: (name: string) => CfnParameter | void;
}
