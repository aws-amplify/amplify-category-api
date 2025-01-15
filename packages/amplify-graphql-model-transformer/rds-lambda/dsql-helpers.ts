import { DsqlSigner } from "@aws-sdk/dsql-signer";

export const generateDSQLAuthToken = async (endpoint: string): Promise<string> => {
  const signer = new DsqlSigner({
    hostname: endpoint,
  });
  try {
    const token = await signer.getDbConnectAdminAuthToken();
    return token;
  } catch (error) {
    throw error;
  }
}

export const isDSQLHostname = (endpoint: string): boolean => {
  return endpoint.includes(".dsql.") && endpoint.endsWith(".on.aws");
}