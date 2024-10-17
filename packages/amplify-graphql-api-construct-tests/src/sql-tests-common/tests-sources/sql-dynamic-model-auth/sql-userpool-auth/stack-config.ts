import { AUTH_TYPE } from 'aws-appsync';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { schema as generateSchema } from './provider';
import { StackConfig } from '../../../../utils/sql-stack-config';
import { userGroupNames } from '../../../../utils/sql-provider-helper';

export const stackConfig = (engine: ImportedRDSType): StackConfig => {
  const stackConfig: StackConfig = {
    schema: generateSchema(engine),
    authMode: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
    userGroups: userGroupNames,
  };

  return stackConfig;
};
