import { FilePathExtractor } from './extract-file-from-stack-trace-lines';
import { dirname, join } from 'path';

type PathEntry = {
  relativePath: string;
  importLine: string;
};
export type JsResolverEntry = string | PathEntry;

/**
 * Resolve JS Resolver Handler or Sql Reference Handler entry path to absolute path
 * @param entry handler entry
 * @returns resolved absolute file path
 */
export const resolveEntryPath = (entry: JsResolverEntry): string => {
  const unresolvedImportLocationError = new Error(
    'UnresolvedEntryPathError. Could not determine import path to construct absolute code path from relative path: ' +
      JSON.stringify(entry) +
      ' Consider using an absolute path instead.',
  );

  if (typeof entry === 'string') {
    return entry;
  }

  const filePath = new FilePathExtractor(entry.importLine).extract();
  if (filePath) {
    return join(dirname(filePath), entry.relativePath);
  }

  throw unresolvedImportLocationError;
};
