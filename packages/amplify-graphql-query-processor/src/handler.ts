import { mySqlPasswordClient } from './clients/mysql/MySQLPasswordClient';

export const processRequest = async (event) => {
  const result = await mySqlPasswordClient.executeRequest(event);
  return result;
}
