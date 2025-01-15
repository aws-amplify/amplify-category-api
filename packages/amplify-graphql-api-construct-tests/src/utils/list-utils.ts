export const valueOrFirstValue = <T>(valueOrArray: T | T[]): T => {
  if (Array.isArray(valueOrArray)) {
    return valueOrArray[0];
  }

  return valueOrArray;
};
