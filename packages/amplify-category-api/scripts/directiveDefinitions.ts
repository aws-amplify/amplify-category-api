import { getDefaultDirectiveDefinitions } from '@aws-amplify/amplify-category-api';

(async () => {
  console.log(await getDefaultDirectiveDefinitions());
})();
