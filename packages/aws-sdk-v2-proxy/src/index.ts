import * as aws from 'aws-sdk';

// Demonstration of how we're Proxying:
// https://www.typescriptlang.org/play/?#code/MYewdgziA2CmB0w4EMBOAKAlAbgFC4DMBXMYAFwEtwACAB1RAA8BPAHgBUA+dEALmvYAaaqDBlYjMv3QQyqCmADm1AD7UIzALYAjGKupgiO2KkwBtALrUAvNUuZ+7agG9c1ahQLV0ZZrVggXiA21rYA5MSklOBhmC5u7tSosGREqGDe6PDZaIoQ-MhgzHHWnPGJiaJQcPDQIIroAAYAwsjQ0ArKACTOouKS8ABWIAroYfCxAL5YjTgJFcmp6dQgWTmoeXMVk3HIEAJ47pMeXj5+AUEh4SDag7DkseWJi2kZYLAA7tQACgwsPNQ9oCisJXBV3IoUugAPpkXIpYT0EC0AByyE0sDiYPB7heyyR-wBQMKxTMSNR6NgFmEZmyiHA-TIiIYFIxFi24Mm82oO0B+3Yhx51Fg0AgsCe7iqMAQdQajWQwGAsAgEE61B6fQkZCGIzAYwmmEms0FuJSrxWgq5kzwuCqZBWNieyH4YWQ6jknTCggS2n4AEYAEwAZm9EOSULAlP4snkSix3LxGUaAAsRXV1c5IxijZbQyJ+Nj3AATAvcsOwFIAEQrtGgzHQWdg0Y9cYl4MT1EaAHVk8xqKn2sEyKnksIeo2c2WedyuUdcNb8Ha6I6CfWQDSwiAwuybVKarL0LR4Mg5nuZfVD-BtKfwNVzw0j4pw2Qxh8QKhoEXYjfINLahej2AeAi3gJ8KzIatYFreswjfD8v0wHAgA

const proxy = <T>(o: T, context: (string | symbol | number)[] = []): T => {
  if (typeof o === 'function') {
    return ((...args: any) => {
      console.log(`Calling ${context.join('.')}()`);
      return o(...args);
    }) as T;
  }
  if (typeof o === 'object') {
    return new Proxy(o as any, {
      get: (_, propName) => {
        return proxy((o as any)[propName], [...context, propName]);
      },
    }) as T;
  } else {
    console.log(`accessing ${context.join('.')}`);
    return o;
  }
};

const awsProxy = proxy(aws, ['aws-sdk']);

export default awsProxy;
