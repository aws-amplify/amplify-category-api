import _ from 'lodash';
import { join } from 'path';
import * as fs from 'fs-extra';
import { parse } from 'graphql';
import axios from 'axios';
import {
  getProjectMeta,
  RDSTestDataProvider,
  createRDSInstance,
  addRDSPortInboundRule,
} from 'amplify-category-api-e2e-core';

export const verifyAmplifyMeta = (projectRoot: string, apiName: string, database: string) => {
  // Database info is updated in meta file
  const meta = getProjectMeta(projectRoot);
  const apiMeta = _.get(meta, ["api", apiName]);
  expect(apiMeta).toBeDefined();
  const dataSourceConfig = _.get(apiMeta, "dataSourceConfig");
  expect(dataSourceConfig).toBeDefined();
  expect(dataSourceConfig).toEqual({
    mysql: database
  });
};

export const verifyCompiledSchema = (projectRoot: string, apiName: string, expected: string) => {
  const compiledSchemaPath = join(projectRoot, "amplify", "backend", "api", apiName, "build", "schema.graphql");
  expect(fs.existsSync(compiledSchemaPath)).toEqual(true);

  const schema = fs.readFileSync(compiledSchemaPath, { encoding: "utf-8" });
  const parsedSchema = parse(schema);
  expect(parsedSchema?.definitions).toBeDefined();
  expect(schema).toContain("type Employee");
  expect(schema).toContain("type Person");
  expect(schema).toContain("type Contacts");
  expect(schema.trim()).toEqual(expected.trim());
};

export type TestDBSetupInfo = {
  database: string,
  host: string,
  port: number,
  username: string,
  password: string,
  publicIpCidr: string,
  region: string,
  identifier: string
};

export const setupRDSDatabase = async (
  dbInfo: Pick<TestDBSetupInfo, 'username'|'password'|'database'|'identifier'|'region'>
): Promise<{ dbAdapter: RDSTestDataProvider, dbInfo: TestDBSetupInfo }> => {
  // Get the public IP of the machine running the test
  const url = "http://api.ipify.org/";
  const response = await axios(url);
  const publicIpCidr = `${response.data.trim()}/32`;

  const username = dbInfo.username;
  const password = dbInfo.password;
  const db = await createRDSInstance({
    identifier: dbInfo.identifier,
    engine: "mysql",
    dbname: dbInfo.database,
    username,
    password,
    region: dbInfo.region
  });

  await addRDSPortInboundRule({
    region: dbInfo.region,
    port: db.port,
    cidrIp: publicIpCidr
  });

  const dbAdapter = new RDSTestDataProvider({
    host: db.endpoint,
    port: db.port,
    username,
    password,
    database: dbInfo.database
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
      identifier: dbInfo.identifier
    }
  };
};

export const verifyRDSSchema = (projectRoot: string, apiName: string, expected: string = '') => {
  const rdsSchemaPath = join(projectRoot, "amplify", "backend", "api", apiName, "schema.rds.graphql");
  const expectExists = !_.isEmpty(expected);
  expect(fs.existsSync(rdsSchemaPath)).toEqual(expectExists);
  if(!expectExists) {
    return;
  }
  const schema = fs.readFileSync(rdsSchemaPath, { encoding: "utf-8" });
  expect(schema.trim()).toEqual(expected.trim());
};
