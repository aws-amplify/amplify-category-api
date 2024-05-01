import * as fs from 'fs';
import knex, { Knex } from 'knex';

export const establishDBConnection = (config: any): any => {
  const databaseConfig = {
    host: config.host,
    database: config.database,
    port: config.port,
    user: config.username,
    password: config.password,
    ssl: {
      rejectUnauthorized: true,
      ca: getRDSCertificate(),
    },
  };
  try {
    return knex({
      client: config.engine === 'postgres' ? 'pg' : 'mysql2',
      connection: databaseConfig,
      pool: {
        min: 5,
        max: 30,
        createTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
      },
      debug: false,
    });
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const getRDSCertificate = (): string => {
  // This certificate file is copied from the parent folder `amplify-graphql-schema-generator/certs/aws-rds-global-bundle.pem`.
  const RDS_CERT_FILE_NAME = 'aws-rds-global-bundle.pem';
  return fs.readFileSync(RDS_CERT_FILE_NAME, 'utf-8');
};
