import * as fs from 'fs';
import * as path from 'path';

// This logic to get the SSL config must match with the SQL Lambda Layer.
// If you are changing this, please make sure to change the logic in the SQL Lambda Layer as well.
export const getSSLConfig = (
  host: string,
): {
  rejectUnauthorized: boolean;
  ca?: string;
} => {
  const AWS_RDS_HOSTS = ['rds.amazonaws.com'];
  const isRDS = AWS_RDS_HOSTS.some((rdsHost) => host.toLowerCase().endsWith(rdsHost));
  const sslConfig = {
    rejectUnauthorized: true,
    ...(isRDS && { ca: getRDSCertificate() }),
  };
  return sslConfig;
};

const getRDSCertificate = (): string => {
  // To know more about the RDS certificate, refer https://repost.aws/knowledge-center/rds-connect-ssl-connection
  // The certificate is publicly available and downloaded from https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
  // Proxies require
  const RDS_CERT_FILE_NAME = 'aws-rds-global-bundle.pem';
  const RDS_CERT_FILE_PATH = path.join(__dirname, RDS_CERT_FILE_NAME);
  return fs.readFileSync(RDS_CERT_FILE_PATH, 'utf-8');
};
