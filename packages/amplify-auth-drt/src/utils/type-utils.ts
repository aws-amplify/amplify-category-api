export const hasKey = <T>(obj: any, key: PropertyKey): key is keyof T => {
  return typeof obj === 'object' && obj !== null && Object.prototype.hasOwnProperty.call(obj, key);
};
