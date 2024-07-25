import { establishDBConnection } from './connection';

export const handler = async (event: any): Promise<any> => {
  const { config, query } = event;
  const db = establishDBConnection(config);

  const queryResult = await db.raw(query);
  const result = readResult(config.engine, queryResult);

  return result;
};

const readResult = (engine: string, result: any): any => {
  switch (engine) {
    case 'mysql':
      return result[0];
    case 'postgres':
      return result.rows;
    default:
      return result[0];
  }
};
