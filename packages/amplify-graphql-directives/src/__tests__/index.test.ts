import { parse } from 'graphql';
import * as directives from '..';

describe('Directive Definitions', () => {
  test.each(Object.entries(directives))('%s', (_, directive) => {
    // assert valid graphql syntax
    expect(() => parse(directive.definition)).not.toThrow();

    // assert no changes to directive
    expect(directive).toMatchSnapshot();
  });
});
