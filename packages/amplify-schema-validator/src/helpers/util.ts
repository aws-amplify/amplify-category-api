/**
 * Gets the graphql name from a string by removing any special characters and spaces
 *
 * @param val string
 * @returns string
 */
export const getGraphqlName = (val: string): string => {
  if (!val.trim()) {
    /* istanbul ignore next */
    return '';
  }
  const cleaned = val.replace(/^[^_A-Za-z]+|[^_0-9A-Za-z]/g, '');
  return cleaned;
};

/**
 *
 * @param word
 */
export const toUpper = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);
