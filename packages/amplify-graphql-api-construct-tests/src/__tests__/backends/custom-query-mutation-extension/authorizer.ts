type CustomAuthorizerEvent = {
  authorizationToken?: string;
};

exports.handler = async (event: CustomAuthorizerEvent) => {
  const { authorizationToken } = event;
  const response = {
    isAuthorized: authorizationToken === 'custom-authorized',
    ttlOverride: 0,
  };
  return response;
};
