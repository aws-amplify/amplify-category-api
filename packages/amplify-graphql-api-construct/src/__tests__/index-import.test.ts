// ############################################################################
// This exists only to provide coverage metrics for various export files. If
// you include executable code in any of the referenced files, you must test it
// separately in a dedicated *.test.ts file.
// ############################################################################

import * as src from '../index';
import * as types from '../types';

test('Work around coverage metrics for export and type-only files', () => {
  expect(src).toBeDefined();
  expect(types).toBeDefined();
});
