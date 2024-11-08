/**
 * Normalizes an input string to a value suitable for a CDK prefix:
 * - Converts individual words to PascalCase
 * - Strips any non alphanumeric characters
 * - Truncates to 13 characters
 *
 * **Examples**
 * ```
 * normalizeCdkPrefix('this is a test'); // ThisIsATest
 * normalizeCdkPrefix('this is a longer string'); // ThisIsALonger
 * ```
 */
export const normalizeCdkPrefix = (input: string): string => {
  // Delete everything except alphanumeric and spaces
  const normalized = input.replaceAll(/[^A-Za-z0-9 ]/g, '').trim();
  const words = normalized.split(' ');
  const formatted = toPascalCase(words);
  return formatted;
};

/**
 * Converts an array of words so that each string is uppercase, then joins all words.
 *
 * **Examples**
 * ```
 * toPascalCase(['foo', 'bar', 'baz']); // FooBarBaz
 * toPascalCase(['FOO', 'bar', 'baz']); // FOOBarBaz
 * toPascalCase(['fOO', 'bar', 'baz']); // FOOBarBaz
 * toPascalCase(['123abc', 'bar', 'baz']); // 123abcBarBaz
 * ```
 */
export const toPascalCase = (words: string[]): string => {
  const formatted = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return formatted.join('');
};
