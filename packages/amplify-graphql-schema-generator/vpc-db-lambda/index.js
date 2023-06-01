import { establishDBConnection } from "./connection.js";

export const handler = async (event) => {
  const { config, query } = event;
  const db = establishDBConnection(config);

  const result = (await db.raw(query))[0];
  const data = result;

  return data;
};
