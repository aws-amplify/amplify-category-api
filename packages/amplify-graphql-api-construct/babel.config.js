/**
 * To all ye who venture into the world of jest and babel config, I wish ye the best of luck
 *
 * This file is here because for some reason babel-jest in jest 26 does not load config from the package.json file
 * https://github.com/jestjs/jest/issues/6229#issuecomment-419885857
 */

module.exports = (api) => {
  api.cache(true);

  return {
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  };
};
