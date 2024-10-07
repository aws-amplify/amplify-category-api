import { AUTH_TYPE } from 'aws-appsync';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { schema as generateSchema } from './provider';
import { StackConfig } from '../../../utils/sql-stack-config';

export const stackConfig = (): StackConfig => {
  const stackConfig: StackConfig = {
    schema: generateSchema(),
    authMode: AUTH_TYPE.API_KEY,
    useSandbox: true,
  };

  return stackConfig;
};
