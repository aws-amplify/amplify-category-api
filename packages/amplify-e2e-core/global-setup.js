// Allow people to use `amplify-category-api-e2e-core/global-setup` as a jest globalSetup.
const globalSetup = require('./lib/jest-global-setup');

module.exports = globalSetup.default || globalSetup;
