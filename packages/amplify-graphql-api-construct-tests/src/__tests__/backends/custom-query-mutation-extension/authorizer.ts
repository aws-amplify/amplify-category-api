exports.handler = async (event) => {
  const { authorizationToken } = event;
  const response = {
    isAuthorized: authorizationToken === 'custom-authorized',
    ttlOverride: 0,
  };
  return response;
};
