const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');

exports.handler = async (event) => {
  const { secretNames } = event;
  const ssmClient = new SSMClient();
  const result = await ssmClient.send(
    new GetParametersCommand({
      Names: secretNames.map((secretName) => process.env[secretName]),
      WithDecryption: true,
    }),
  );
  return result.Parameters;
};
