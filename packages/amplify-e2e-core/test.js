import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const loadCredentials = async () => {
  const provider = fromNodeProviderChain({
    profile: 'test-profile',
  });

  try {
    const credentials = await provider();
    console.log(credentials);
  } catch (e) {
    console.error(e);
  }
};

void loadCredentials();
