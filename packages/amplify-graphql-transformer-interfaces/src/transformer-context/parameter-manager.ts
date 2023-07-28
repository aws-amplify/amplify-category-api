import { CfnParameter, CfnParameterProps } from 'aws-cdk-lib';

export type ParameterManager = {
  addParameter: (name: string, props: CfnParameterProps) => CfnParameter;
  getParameter: (name: string) => CfnParameter | void;
};
