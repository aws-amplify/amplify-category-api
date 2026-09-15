import { parse } from 'graphql';
import * as Directives from '..';
import type { Directive } from '..';
import { AppSyncDirectives, DefaultDirectives, V1Directives, V2Directives } from '..';

describe('Directive Definitions', () => {
  // remove lists of Directives, i.e. AppSyncDirectives, DefaultDirectives, V1Directives, and V2Directives
  test.each(Object.entries(Directives).filter(([_, directive]) => !Array.isArray(directive)) as unknown as [string, Directive][])(
    '%s',
    (_, directive: Directive) => {
      // assert valid graphql syntax
      expect(() => parse(directive.definition)).not.toThrow();

      // assert no changes to directive
      expect(directive).toMatchSnapshot();
    },
  );

  test('include correct directives in AppSync directives', () => {
    expect(AppSyncDirectives.map((directive) => directive.name)).toMatchSnapshot();
  });

  test('no negative interactions for AppSync directives', () => {
    const directives = AppSyncDirectives.map((directive) => directive.definition).join('\n');

    // asserts directives can be parsed together
    expect(() => parse(directives)).not.toThrow();
  });

  test('include correct directives in V2 directives', () => {
    expect(V2Directives.map((directive) => directive.name)).toMatchSnapshot();
  });

  test('no negative interactions for V2 directives', () => {
    const directives = V2Directives.map((directive) => directive.definition).join('\n');

    // asserts directives can be parsed together
    expect(() => parse(directives)).not.toThrow();
  });

  test('include correct directives in default directives', () => {
    expect(DefaultDirectives.map((directive) => directive.name)).toMatchSnapshot();
  });

  test('no negative interactions for default directives', () => {
    const directives = DefaultDirectives.map((directive) => directive.definition).join('\n');

    // asserts directives can be parsed together
    expect(() => parse(directives)).not.toThrow();
  });

  test('include correct directives in V1 directives', () => {
    expect(V1Directives.map((directive) => directive.name)).toMatchSnapshot();
  });

  test('no negative interactions for V1 directives', () => {
    const directives = V1Directives.map((directive) => directive.definition).join('\n');

    // asserts directives can be parsed together
    expect(() => parse(directives)).not.toThrow();
  });
});
