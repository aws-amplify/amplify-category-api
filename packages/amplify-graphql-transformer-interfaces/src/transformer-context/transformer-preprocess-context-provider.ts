import { DocumentNode } from 'graphql';
import { FeatureFlagProvider } from '../feature-flag-provider';
import { TransformerSchemaHelperProvider } from './schema-helper-provider';

export interface TransformerPreProcessContextProvider {
  inputDocument: DocumentNode;
  featureFlags: FeatureFlagProvider;
  schemaHelper: TransformerSchemaHelperProvider;
}
