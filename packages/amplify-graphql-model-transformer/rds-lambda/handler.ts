import { postgresPasswordClient } from './clients/postgres/PostgresPasswordClient.js';
import { mySqlPasswordClient } from './clients/mysql/MySQLPasswordClient.js';

export const run = async (event) => {
  const result = await mySqlPasswordClient.executeRequest(event);
  return result;
};
