import * as types from '../types';

describe('types', () => {
  test('types are exported', () => {
    expect(types).toBeDefined();
    expect(types).toMatchSnapshot();
  });
});
