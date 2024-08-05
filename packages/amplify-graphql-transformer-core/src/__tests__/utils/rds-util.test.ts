import { getParameterStoreSecretPath } from '../../utils/rds-util';

describe('rds-util', () => {
  describe('getParameterStoreSecretPath', () => {
    it('should return the correct path', () => {
      const apiName = 'testapiName';
      const appId = 'testappId';
      const environmentName = 'testenvironmentName';
      const secret = 'testsecret';
      const secretsKey = 'testsecretsKey';

      const result = getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, appId);
      expect(result).toEqual('/amplify/testappId/testenvironmentName/AMPLIFY_apitestapiNametestsecretsKey_testsecret');
    });

    it('should throw for an empty appId', () => {
      const apiName = 'testapiName';
      const appId = '';
      const environmentName = 'testenvironmentName';
      const secret = 'testsecret';
      const secretsKey = 'testsecretsKey';

      expect(() => getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, appId)).toThrow('Unable to read the App ID');
    });

    it('should throw for an empty environmentName', () => {
      const apiName = 'testapiName';
      const appId = 'testappId';
      const environmentName = '';
      const secret = 'testsecret';
      const secretsKey = 'testsecretsKey';

      expect(() => getParameterStoreSecretPath(secret, secretsKey, apiName, environmentName, appId)).toThrow(
        'Unable to create RDS secret path, environment not found/defined',
      );
    });
  });
});
