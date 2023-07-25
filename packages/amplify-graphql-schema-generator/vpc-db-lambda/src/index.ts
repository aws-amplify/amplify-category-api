import { establishDBConnection } from './connection';

export const handler = async (event: any): Promise<any> => {
  const { config, query } = event;
  const db = establishDBConnection(config);

  const result = (await db.raw(query))[0];
  const data = result;

  return data;
};
