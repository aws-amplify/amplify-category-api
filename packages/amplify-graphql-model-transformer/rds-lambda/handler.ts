import { mySqlPasswordClient } from './clients/mysql/MySQLPasswordClient';

export const run = async (event) => {
  const result = await mySqlPasswordClient.executeRequest(event);
  return result;
};
