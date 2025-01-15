import { AUTH_TYPE } from 'aws-appsync';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';
import { StackConfig } from '../../../../utils/sql-stack-config';
import { userGroupNames } from '../../../../utils/sql-provider-helper';
import { schema as generateSchema } from './provider';

export const stackConfig = (engine: ImportedRDSType): StackConfig => {
  const config: StackConfig = {
    schema: generateSchema(engine),
    authMode: AUTH_TYPE.OPENID_CONNECT,
    userGroups: userGroupNames,
    oidcOptions: {
      triggers: {
        preTokenGeneration: `
              exports.handler = async event => {
                  event.response = {
                      claimsOverrideDetails: {
                          claimsToAddOrOverride: {
                              user_id: event.userName,
                          }
                      }
                  };
                  return event;
              };
            `,
      },
    },
  };

  return config;
};
