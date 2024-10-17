export const handler = async ({ authorizationToken }: { authorizationToken: string }): Promise<{ isAuthorized: boolean }> => ({
  isAuthorized: authorizationToken === 'letmein',
});
