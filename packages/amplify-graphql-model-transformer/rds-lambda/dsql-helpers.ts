import { DsqlSigner } from "@aws-sdk/dsql-signer";

export const generateDSQLAuthToken = async (endpoint: string, admin = false): Promise<string> => {
  const signer = new DsqlSigner({
    hostname: endpoint,
  });
  try {
    const token = admin ? await signer.getDbConnectAdminAuthToken() : await signer.getDbConnectAuthToken();
    return token;
  } catch (error) {
    throw error;
  }
}

export const isDSQLHostname = (endpoint: string): boolean => {
  return endpoint.includes(".dsql.") && endpoint.endsWith(".on.aws");
}