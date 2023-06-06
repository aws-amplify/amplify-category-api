import { AmplifyApiGraphQlResourceStackTemplate } from "../amplify-api-resource-stack-types";

export interface OverridesProvider {
  (): AmplifyApiGraphQlResourceStackTemplate;
}
