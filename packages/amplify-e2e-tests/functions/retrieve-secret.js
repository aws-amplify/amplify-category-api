const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');

exports.handler = async (event) => {
  const { secretNames } = event;
  const client = new SSMClient();
  const command = new GetParametersCommand({
    Names: secretNames.map((secretName) => process.env[secretName]),
    WithDecryption: true,
  });
  const { Parameters } = await client.send(command);
  return Parameters;
};
