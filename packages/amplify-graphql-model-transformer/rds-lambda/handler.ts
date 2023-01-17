import { postgresPasswordClient } from './clients/postgres/PostgresPasswordClient.js';

export const run = async (event) => {
  const result = await postgresPasswordClient.executeRequest(event);
  return result;
};
