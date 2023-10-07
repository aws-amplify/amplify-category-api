import knex, { Knex } from 'knex';

export const establishDBConnection = (config: any): any => {
  const databaseConfig = {
    host: config.host,
    database: config.database,
    port: config.port,
    user: config.username,
    password: config.password,
    ssl: { rejectUnauthorized: false },
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
