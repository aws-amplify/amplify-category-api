import { mySqlPasswordClient } from './clients/mysql/MySQLPasswordClient';

export const run = async (event) => {
  console.log(JSON.stringify(event));
  const result = await mySqlPasswordClient.executeRequest(event);
  console.log(JSON.stringify(result));
  return result;
};
