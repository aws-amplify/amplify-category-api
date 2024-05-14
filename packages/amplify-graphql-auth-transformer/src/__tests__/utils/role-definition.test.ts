import {
  RoleDefinition,
  isIdenticalAuthRole,
  isFieldRoleHavingAccessToBothSide,
  isDynamicAuthOrCustomAuth,
} from '../../utils/role-definition';
import { AuthStrategy, AuthProvider } from '../../utils/definitions';

describe('RoleDefinition', () => {
  describe('isIdenticalAuthRole', () => {
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

    test('matching roles', () => {
      allRoles.forEach((role) => {
        expect(isIdenticalAuthRole(role, { ...role })).toBeTruthy();
      });
    });

    test('non-matching roles', () => {
      const roleCombinations = [].concat(...allRoles.map((roleA, i) => allRoles.slice(i + 1).map((roleB) => [roleA, roleB])));
      roleCombinations.forEach(([roleA, roleB]) => {
        expect(isIdenticalAuthRole(roleA, roleB)).toBeFalsy();
      });
    });
  });

  describe('isFieldRoleHavingAccessToBothSide', () => {
    test('access on both sides', () => {});

    test('non-access on both sides', () => {});
  });

  describe('isDynamicAuthOrCustomAuth', () => {
    test('dynamic', () => {});

    test('custom', () => {});
  });
});
