import { postgresPasswordClient } from './clients/postgres/PostgresPasswordClient.js';

export const run = async (event) => {
  console.log(`Logging Event: ${JSON.stringify(event)}`);
  const result = await postgresPasswordClient.executeRequest(event);
  console.log(JSON.stringify(result));
  return result;
};
