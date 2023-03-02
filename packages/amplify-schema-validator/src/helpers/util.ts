export function getGraphqlName(val: string): string {
  if (!val.trim()) {
    /* istanbul ignore next */
    return '';
  }
  const cleaned = val.replace(/^[^_A-Za-z]+|[^_0-9A-Za-z]/g, '');
  return cleaned;
}

export function toUpper(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
