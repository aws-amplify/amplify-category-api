import { toCamelCase, toPascalCase, toUpper, toLower } from '../util';

describe('To camelCase conversions', () => {
  it('should handle empty list', () => {
    expect(toCamelCase([])).toEqual('');
  });

  it('single word inputs', () => {
    expect(toCamelCase(['world', 'over', 'water'])).toEqual('worldOverWater');
  });

  it('single letter inputs', () => {
    expect(toCamelCase(['W', 'O', 'w'])).toEqual('wOW');
  });

  it('inputs with special characters', () => {
    expect(toCamelCase(['#W', '_o', '-W'])).toEqual('#W_o-W');
  });

  it('empty inputs in list are filtered', () => {
    expect(toCamelCase(['W', '', 'O', 'w'])).toEqual('wOW');
  });
});

describe('To PascalCase conversions', () => {
  it('should handle empty list', () => {
    expect(toPascalCase([])).toEqual('');
  });

  it('single word inputs', () => {
    expect(toPascalCase(['world', 'over', 'water'])).toEqual('WorldOverWater');
  });

  it('single letter inputs', () => {
    expect(toPascalCase(['w', 'O', 'w'])).toEqual('WOW');
  });

  it('special characters in inputs are retained', () => {
    expect(toPascalCase(['#W', '_o', '-W'])).toEqual('#W_o-W');
  });
});
