/**
 * During the build of this package we are transforming a couple node_modules in place.
 * This config is used for that transformation
 * See the transform-deps script in package.json for specifics on which packages are being transformed
 */

module.exports = (api) => {
  api.cache(true);

  return {
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  };
};
