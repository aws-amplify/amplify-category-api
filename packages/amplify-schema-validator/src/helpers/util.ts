export const getGraphqlName = (val: string): string => {
  if (!val.trim()) {
    /* istanbul ignore next */
    return '';
  }
  const cleaned = val.replace(/^[^_A-Za-z]+|[^_0-9A-Za-z]/g, '');
  return cleaned;
};

export const toUpper = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);
