// This exists only to provide coverage metrics for various export files

import * as src from '../index';
import * as types from '../types';

test('Work around coverage metrics for export and type-only files', () => {
  expect(src).toBeDefined();
  expect(types).toBeDefined();
});
