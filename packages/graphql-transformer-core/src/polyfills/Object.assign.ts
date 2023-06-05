interface ObjectConstructor {
  assign: (target: any, ...sources: any[]) => any;
}

if (typeof Object.assign !== 'function') {
  (function () {
    Object.assign = function (target: any) {
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      const output = Object(target);
      for (let index = 1; index < arguments.length; index++) {
        const source = arguments[index];
        if (source !== undefined && source !== null) {
          for (const nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  }());
}
