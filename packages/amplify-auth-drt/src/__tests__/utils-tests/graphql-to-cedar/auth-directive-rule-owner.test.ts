import { ListValueNode, ObjectValueNode, parse } from 'graphql';
import {
  DirectivesProvider,
  hasDirectiveNamed,
  isAuthDirectiveRuleValueOwnerDefault,
  isAuthDirectiveRuleValueOwnerUserPools,
} from '../../../utils';

describe('owner auth rule utilities', () => {
  describe('isAuthDirectiveRuleValueOwnerDefault', () => {
    test('handles a valid owner auth rule', () => {
      const doc = parse(/* GraphQL */ `
        type Todo @auth(rules: [{ allow: owner }]) {
          id: ID!
        }
      `);

      const type = doc.definitions.find((def) => hasDirectiveNamed(def as DirectivesProvider, 'auth'))! as DirectivesProvider;
      const directive = type.directives!.find((d) => d.name.value === 'auth')!;
      expect(directive).toBeDefined();

      const rulesArgument = directive.arguments![0];
      expect(rulesArgument).toBeDefined();

      const rulesListValue = rulesArgument.value as ListValueNode;
      expect(rulesListValue).toBeDefined();

      const rule = rulesListValue.values[0] as ObjectValueNode;
      expect(rule).toBeDefined();

      expect(isAuthDirectiveRuleValueOwnerDefault(rule)).toBe(true);
    });
  });

  describe('isAuthDirectiveRuleValueOwnerUserPools', () => {
    test('handles a valid owner auth rule', () => {
      const doc = parse(/* GraphQL */ `
        type Todo @auth(rules: [{ allow: owner, provider: userPools }]) {
          id: ID!
        }
      `);

      const type = doc.definitions.find((def) => hasDirectiveNamed(def as DirectivesProvider, 'auth'))! as DirectivesProvider;
      const directive = type.directives!.find((d) => d.name.value === 'auth')!;
      expect(directive).toBeDefined();

      const rulesArgument = directive.arguments![0];
      expect(rulesArgument).toBeDefined();

      const rulesListValue = rulesArgument.value as ListValueNode;
      expect(rulesListValue).toBeDefined();

      const rule = rulesListValue.values[0] as ObjectValueNode;
      expect(rule).toBeDefined();

      expect(isAuthDirectiveRuleValueOwnerUserPools(rule)).toBe(true);
    });
  });
});
