import {
  RoleDefinition,
  isIdenticalAuthRole,
  isFieldRoleHavingAccessToBothSide,
  isDynamicAuthOrCustomAuth,
} from '../../utils/role-definition';
import { AuthStrategy, AuthProvider } from '../../utils/definitions';

describe('RoleDefinition', () => {
  const authStrategies: AuthStrategy[] = ['owner', 'groups', 'public', 'private', 'custom'];
  const authProviders: AuthProvider[] = ['apiKey', 'iam', 'identityPool', 'oidc', 'userPools', 'function'];
  const staticOptions = [true, false];
  const claims = ['claim', '', undefined];
  const entities = ['entity', '', undefined];

  const nestedAllRoles: RoleDefinition[][][][][] = authStrategies.map((strategy): RoleDefinition[][][][] =>
    authProviders.map((provider): RoleDefinition[][][] =>
      staticOptions.map((staticOption): RoleDefinition[][] =>
        claims.map((claim): RoleDefinition[] =>
          entities.map((entity): RoleDefinition => ({ strategy, provider, static: staticOption, claim, entity })),
        ),
      ),
    ),
  );
  // flat()/flatMap() not available with current build config
  const allRoles = Array.prototype.concat(
    ...Array.prototype.concat(...Array.prototype.concat(...Array.prototype.concat(...nestedAllRoles))),
  );

  describe('isIdenticalAuthRole', () => {
    describe('matching roles', () => {
      test.each(allRoles)('%j', (role) => {
        expect(isIdenticalAuthRole(role, { ...role })).toBeTruthy();
      });
    });

    test('non-matching roles', () => {
      const roleCombinations = [].concat(...allRoles.map((roleA, i) => allRoles.slice(i + 1).map((roleB) => [roleA, roleB])));
      // not using test.each here because there are 145,530 combinations
      roleCombinations.forEach(([roleA, roleB]) => {
        expect(isIdenticalAuthRole(roleA, roleB)).toBeFalsy();
      });
    });
  });

  describe('isFieldRoleHavingAccessToBothSide', () => {
    describe('access on both sides', () => {
      describe('identical roles', () => {
        test.each(allRoles)('%j', (role) => {
          expect(isFieldRoleHavingAccessToBothSide(role, [{ ...role }])).toBeTruthy();
        });
      });

      describe('non-identical roles', () => {
        const providers: AuthProvider[] = ['userPools', 'oidc', 'identityPool'];
        test.each(providers)('provider %s private on fieldRole', (provider) => {
          const fieldRole = {
            provider,
            strategy: 'private' as AuthStrategy,
            static: false,
          };
          const relatedModelRoles = [
            {
              provider,
              strategy: 'public' as AuthStrategy,
              static: true,
            },
          ];

          expect(isFieldRoleHavingAccessToBothSide(fieldRole, relatedModelRoles)).toBeTruthy();
        });

        test.each(providers)('provider %s private on relatedModelRoles', (provider) => {
          const fieldRole = {
            provider,
            strategy: 'public' as AuthStrategy,
            static: false,
          };
          const relatedModelRoles = [
            {
              provider,
              strategy: 'private' as AuthStrategy,
              static: true,
            },
          ];

          expect(isFieldRoleHavingAccessToBothSide(fieldRole, relatedModelRoles)).toBeTruthy();
        });
      });
    });

    test('non-access on both sides', () => {
      const fieldRole = {
        provider: 'owner' as AuthProvider,
        strategy: 'public' as AuthStrategy,
        static: false,
      };
      const relatedModelRoles = [
        {
          provider: 'group' as AuthProvider,
          strategy: 'private' as AuthStrategy,
          static: true,
        },
      ];

      expect(isFieldRoleHavingAccessToBothSide(fieldRole, relatedModelRoles)).toBeFalsy();
    });
  });

  describe('isDynamicAuthOrCustomAuth', () => {
    test.each(allRoles)('%j', (role) => {
      expect({ role, result: isDynamicAuthOrCustomAuth(role) ? 'dynamic' : 'custom' }).toMatchSnapshot();
    });
  });
});
