/**
 * To all ye who venture into the world of jest and babel config, I wish ye the best of luck
 *
 * This file is here because for some reason babel-jest in jest 26 does not load config from the package.json file
 * https://github.com/jestjs/jest/issues/6229#issuecomment-419885857
 *
 * Also note that during the build of this package we are transforming a couple node_modules in place.
 * See the build script in package.json for specifics.
 */

module.exports = (api) => {
  api.cache(true);

  return {
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  };
};
