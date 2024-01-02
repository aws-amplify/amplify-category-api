import { join } from 'path';
import _ from 'lodash';
import * as fs from 'fs-extra';
import { parse, ObjectTypeDefinitionNode, Kind, visit, FieldDefinitionNode, StringValueNode } from 'graphql';
import axios from 'axios';
import {
  getProjectMeta,
  RDSTestDataProvider,
  createRDSInstance,
  addRDSPortInboundRule,
  getAppSyncApi,
} from 'amplify-category-api-e2e-core';
import { getBaseType, isArrayOrObject, toPascalCase } from 'graphql-transformer-common';
import { GQLQueryHelper } from '../query-utils/gql-helper';
import {
  getConfiguredAppsyncClientAPIKeyAuth,
  getConfiguredAppsyncClientCognitoAuth,
  getConfiguredAppsyncClientOIDCAuth,
} from '../schema-api-directives';
import path from 'path';
import { ImportedRDSType } from '@aws-amplify/graphql-transformer-core';

const HAS_MANY_DIRECTIVE = 'hasMany';
const HAS_ONE_DIRECTIVE = 'hasOne';
const BELONGS_TO_DIRECTIVE = 'belongsTo';

export const verifyAmplifyMeta = (projectRoot: string, apiName: string, database: string) => {
  // Database info is updated in meta file
  const meta = getProjectMeta(projectRoot);
  const apiMeta = _.get(meta, ['api', apiName]);
  expect(apiMeta).toBeDefined();
  expect(_.get(apiMeta, 'output', 'GraphQLAPIIdOutput')).toBeDefined();
  expect(_.get(apiMeta, 'output', 'GraphQLAPIEndpointOutput')).toBeDefined();
  expect(_.get(apiMeta, 'output', 'GraphQLAPIKeyOutput')).toBeDefined();
};

export const verifyCompiledSchema = (projectRoot: string, apiName: string, expected: string = '') => {
  const compiledSchemaPath = join(projectRoot, 'amplify', 'backend', 'api', apiName, 'build', 'schema.graphql');
  expect(fs.existsSync(compiledSchemaPath)).toEqual(true);

  const schema = fs.readFileSync(compiledSchemaPath, { encoding: 'utf-8' });
  const parsedSchema = parse(schema);
  expect(parsedSchema?.definitions).toBeDefined();
  expect(schema).toContain('type Employee');
  expect(schema).toContain('type Person');
  expect(schema).toContain('type Contacts');
  if (!_.isEmpty(expected)) {
    expect(schema.trim()).toEqual(expected.trim());
  }
};

export type TestDBSetupInfo = {
  database: string;
  host: string;
  port: number;
  username: string;
  password: string;
  publicIpCidr: string;
  region: string;
  identifier: string;
};

export const setupRDSDatabase = async (
  dbInfo: Pick<TestDBSetupInfo, 'username' | 'password' | 'database' | 'identifier' | 'region'>,
): Promise<{ dbAdapter: RDSTestDataProvider; dbInfo: TestDBSetupInfo }> => {
  // Get the public IP of the machine running the test
  const url = 'http://api.ipify.org/';
  const response = await axios(url);
  const publicIpCidr = `${response.data.trim()}/32`;

  const username = dbInfo.username;
  const password = dbInfo.password;
  const db = await createRDSInstance({
    identifier: dbInfo.identifier,
    engine: 'mysql',
    dbname: dbInfo.database,
    username,
    password,
    region: dbInfo.region,
  });

  await addRDSPortInboundRule({
    region: dbInfo.region,
    port: db.port,
    cidrIp: publicIpCidr,
  });

  const dbAdapter = new RDSTestDataProvider({
    host: db.endpoint,
    port: db.port,
    username,
    password,
    database: dbInfo.database,
  });
  return {
    dbAdapter: dbAdapter,
    dbInfo: {
      host: db.endpoint,
      port: db.port,
      username,
      password,
      database: dbInfo.database,
      region: dbInfo.region,
      publicIpCidr: publicIpCidr,
      identifier: dbInfo.identifier,
    },
  };
};

export const verifyRDSSchema = (projectRoot: string, apiName: string, expected: string = '') => {
  const rdsSchemaPath = join(projectRoot, 'amplify', 'backend', 'api', apiName, 'schema.sql.graphql');
  const expectExists = !_.isEmpty(expected);
  expect(fs.existsSync(rdsSchemaPath)).toEqual(expectExists);
  if (!expectExists) {
    return;
  }
  const schema = fs.readFileSync(rdsSchemaPath, { encoding: 'utf-8' });
  expect(schema.trim()).toEqual(expected.trim());
};

export const generateDDL = (schema: string, engine: ImportedRDSType = ImportedRDSType.MYSQL): string[] => {
  const document = parse(schema);
  const sqlStatements = [];
  const schemaVisitor = {
    ObjectTypeDefinition: {
      leave: (node: ObjectTypeDefinitionNode, key, parent, path, ancestors) => {
        if (!node?.directives?.some((d) => d?.name?.value === 'model')) {
          return;
        }
        const tableName = getMappedName(node);
        const fieldStatements = [];
        const fieldsToAdd = node.fields.filter((field) => !isRelationalField(field));
        fieldsToAdd.forEach((field, index) => {
          fieldStatements.push(getFieldStatement(field, index === 0, engine));
        });
        const sql = `CREATE TABLE ${convertToDBSpecificName(tableName, engine)} (${fieldStatements.join(', ')});`;
        sqlStatements.push(sql);
      },
    },
  };
  visit(document, schemaVisitor);
  return sqlStatements;
};

export const convertToDBSpecificName = (name: string, engine: ImportedRDSType): string => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return name;
    case ImportedRDSType.POSTGRESQL:
      return `"${name}"`;
    default:
      return name;
  }
};

export const convertToDBSpecificGraphQLString = (name: string, engine: ImportedRDSType): string => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return name;
    case ImportedRDSType.POSTGRESQL:
      return `\\"\\"${name}\\"\\"`;
    default:
      return name;
  }
};

export const getDefaultDatabasePort = (engine: ImportedRDSType): number => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return 3306;
    case ImportedRDSType.POSTGRESQL:
      return 5432;
    default:
      return 3306;
  }
};

const isRelationalField = (field: FieldDefinitionNode): boolean => {
  return field?.directives?.some((d) => [HAS_MANY_DIRECTIVE, HAS_ONE_DIRECTIVE, BELONGS_TO_DIRECTIVE].includes(d?.name?.value));
};

const getMappedName = (definition: ObjectTypeDefinitionNode | FieldDefinitionNode): string => {
  const name = definition?.name?.value;
  const refersToDirective = definition?.directives?.find((d) => d?.name?.value === 'refersTo');
  if (!refersToDirective) {
    return name;
  }
  const mappedName = (refersToDirective?.arguments?.find((a) => a?.name?.value === 'name')?.value as StringValueNode)?.value;
  if (!mappedName) {
    return name;
  }
  return mappedName;
};

const getFieldStatement = (field: FieldDefinitionNode, isPrimaryKey: boolean, engine: ImportedRDSType): string => {
  const fieldName = getMappedName(field);
  const fieldType = field.type;
  const isNonNull = fieldType.kind === Kind.NON_NULL_TYPE;
  const baseType = getBaseType(fieldType);
  const columnType = isArrayOrObject(fieldType, []) ? getArrayStringFieldType(engine) : convertToSQLType(baseType);
  const sql = `${convertToDBSpecificName(fieldName, engine)} ${columnType} ${isNonNull ? 'NOT NULL' : ''} ${
    isPrimaryKey ? 'PRIMARY KEY' : ''
  }`;
  return sql;
};

const getArrayStringFieldType = (engine: ImportedRDSType): string => {
  switch (engine) {
    case ImportedRDSType.MYSQL:
      return 'JSON'; // MySQL does not support array types
    case ImportedRDSType.POSTGRESQL:
      return 'VARCHAR[]';
    default:
      return 'VARCHAR[]';
  }
};

const convertToSQLType = (type: string): string => {
  switch (type) {
    case 'ID':
    case 'String':
      return 'VARCHAR(255)';
    case 'Int':
      return 'INT';
    case 'Float':
      return 'FLOAT';
    case 'Boolean':
      return 'BOOLEAN';
    case 'AWSDateTime':
      return 'DATETIME';
    default:
      return 'VARCHAR(255)';
  }
};

export const createModelOperationHelpers = (appSyncClient: any, schema: string) => {
  const document = parse(schema);
  const modelOperationHelpers: { [key: string]: GQLQueryHelper } = {};
  const schemaVisitor = {
    ObjectTypeDefinition: {
      leave: (node: ObjectTypeDefinitionNode, key, parent, path, ancestors) => {
        const modelName = node.name.value;
        const selectionSetFields = node.fields.map((f) => f.name.value);
        const selectionSet = /* GraphQL */ `
          ${selectionSetFields.join('\n')}
        `;
        const primaryKeyField = selectionSetFields[0];
        const getSelectionSet = /* GraphQL */ `
          query Get${modelName}($${primaryKeyField}: ID!) {
            get${modelName}(${primaryKeyField}: $${primaryKeyField}) {
              ${selectionSetFields.join('\n')}
            }
          }
        `;
        const listSelectionSet = /* GraphQL */ `
          query List${modelName}s {
            list${modelName}s {
              items {
                ${selectionSetFields.join('\n')}
              }
            }
          }
        `;
        const subscriptionSelectionSet = (operation: string): string => {
          return /* GraphQL */ `
            subscription On${toPascalCase([operation])}${modelName} {
              on${toPascalCase([operation])}${modelName} {
                ${selectionSetFields.join('\n')}
              }
            }
          `;
        };
        const helper = new GQLQueryHelper(appSyncClient, modelName, {
          mutation: {
            create: selectionSet,
            update: selectionSet,
            delete: selectionSet,
          },
          query: {
            get: getSelectionSet,
            list: listSelectionSet,
          },
          subscription: {
            onCreate: subscriptionSelectionSet('create'),
            onUpdate: subscriptionSelectionSet('update'),
            onDelete: subscriptionSelectionSet('delete'),
          },
        });

        modelOperationHelpers[modelName] = helper;
      },
    },
  };
  visit(document, schemaVisitor);
  return modelOperationHelpers;
};

export type AuthProvider = 'apiKey' | 'iam' | 'oidc' | 'userPools' | 'function';

export const configureAppSyncClients = async (
  projRoot: string,
  apiName: string,
  authProviders: AuthProvider[],
  userMap?: { [key: string]: any },
): Promise<any> => {
  const meta = getProjectMeta(projRoot);
  const appRegion = meta.providers.awscloudformation.Region;
  const { output } = meta.api[apiName];
  const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
  const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, appRegion);

  expect(GraphQLAPIIdOutput).toBeDefined();
  expect(GraphQLAPIEndpointOutput).toBeDefined();

  expect(graphqlApi).toBeDefined();
  expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);

  const apiEndPoint = GraphQLAPIEndpointOutput as string;

  const appSyncClients: { [key: string]: any } = {};

  if (authProviders?.includes('userPools') && userMap) {
    appSyncClients['userPools'] = {};
    Object.keys(userMap)?.map((userName: string) => {
      const userAppSyncClient = getConfiguredAppsyncClientCognitoAuth(apiEndPoint, appRegion, userMap[userName]);
      appSyncClients['userPools'][userName] = userAppSyncClient;
    });
  }

  if (authProviders?.includes('oidc') && userMap) {
    appSyncClients['oidc'] = {};
    Object.keys(userMap)?.map((userName: string) => {
      const userAppSyncClient = getConfiguredAppsyncClientOIDCAuth(apiEndPoint, appRegion, userMap[userName]);
      appSyncClients['oidc'][userName] = userAppSyncClient;
    });
  }

  if (authProviders?.includes('apiKey')) {
    expect(GraphQLAPIKeyOutput).toBeDefined();
    appSyncClients['apiKey'] = getConfiguredAppsyncClientAPIKeyAuth(apiEndPoint, appRegion, GraphQLAPIKeyOutput as string);
  }

  return appSyncClients;
};

export const getAppSyncEndpoint = (projRoot: string, apiName: string): string => {
  const meta = getProjectMeta(projRoot);
  const { output } = meta.api[apiName];
  const { GraphQLAPIEndpointOutput } = output;
  expect(GraphQLAPIEndpointOutput).toBeDefined();
  return GraphQLAPIEndpointOutput as string;
};

export const checkOperationResult = (
  result: any,
  expected: any,
  resultSetName: string,
  isList: boolean = false,
  errors?: string[],
): void => {
  expect(result).toBeDefined();
  expect(result.data).toBeDefined();
  expect(result.data[resultSetName]).toBeDefined();
  delete result.data[resultSetName]['__typename'];
  if (!isList) {
    expect(result.data[resultSetName]).toEqual(expected);
    return;
  }
  expect(result.data[resultSetName].items).toHaveLength(expected?.length);
  result.data[resultSetName]?.items?.forEach((item: any, index: number) => {
    delete item['__typename'];
    expect(item).toEqual(expected[index]);
  });

  if (errors && errors.length > 0) {
    expect(result.errors).toBeDefined();
    expect(result.errors).toHaveLength(errors.length);
    errors.map((error: string) => {
      expect(result.errors).toContain(error);
    });
  }
};

export const checkListItemExistence = (
  result: any,
  resultSetName: string,
  primaryKeyValue: string,
  shouldExist = false,
  primaryKeyName = 'id',
) => {
  expect(result.data[`${resultSetName}`]).toBeDefined();
  expect(result.data[`${resultSetName}`].items).toBeDefined();
  expect(result.data[`${resultSetName}`].items?.filter((item: any) => item[primaryKeyName] === primaryKeyValue)?.length).toEqual(
    shouldExist ? 1 : 0,
  );
};

export const checkListResponseErrors = (result: any, errors: string[]) => {
  expect(result.errors).toBeDefined();
  expect(result.errors?.length).toBeGreaterThan(0);
  errors.map((error: string) => {
    expect(result.errors.findIndex((receivedError: any) => receivedError.message === error)).toBeGreaterThanOrEqual(0);
  });
};

export const appendAmplifyInput = (schema: string, engine: ImportedRDSType): string => {
  const amplifyInput = (engineName: ImportedRDSType): string => {
    return `
      input AMPLIFY {
        engine: String = "${engineName}",
        globalAuthRule: AuthRule = {allow: public}
      }
    `;
  };
  return amplifyInput(engine) + '\n' + schema;
};

export const updatePreAuthTrigger = (projRoot: string, usernameClaim: string) => {
  const backendFunctionDirPath = path.join(projRoot, 'amplify', 'backend', 'function');
  const functionName = fs.readdirSync(backendFunctionDirPath)[0];
  const triggerHandlerFilePath = path.join(backendFunctionDirPath, functionName, 'src', 'alter-claims.js');
  const func = `
            exports.handler = async event => {
                const userGroups = [];
                event.response = {
                    claimsOverrideDetails: {
                        claimsToAddOrOverride: {
                            ${usernameClaim}: event.userName,
                        }
                    }
                };
                return event;
            };
        `;
  fs.writeFileSync(triggerHandlerFilePath, func);
};

export const expectNullFields = (result: any, nullFields: string[]) => {
  nullFields.map((field) => {
    expect(result[field]).toBeNull();
  });
};

export const expectedFieldErrors = (fields: string[], typeName: string, includePrefix = true) =>
  fields.map(
    (field) => `${includePrefix ? '"GraphQL error: ' : ''}Not Authorized to access ${field} on type ${typeName}${includePrefix ? '"' : ''}`,
  );

export const expectedOperationError = (operation: string, typeName: string) =>
  `"GraphQL error: Not Authorized to access ${operation} on type ${typeName}"`;
