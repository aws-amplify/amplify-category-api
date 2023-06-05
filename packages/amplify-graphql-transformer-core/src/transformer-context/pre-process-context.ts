import {
  FeatureFlagProvider,
  TransformerPreProcessContextProvider,
  TransformerSchemaHelperProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { DocumentNode } from 'graphql';
import { TransformerSchemaHelper } from './schema-helper';
import { NoopFeatureFlagProvider } from './noop-feature-flag';

/**
 *
 */
export class TransformerPreProcessContext implements TransformerPreProcessContextProvider {
  inputDocument: DocumentNode;
  featureFlags: FeatureFlagProvider;
  schemaHelper: TransformerSchemaHelperProvider;

  constructor(
    inputDocument: DocumentNode,
    featureFlags?: FeatureFlagProvider,
  ) {
    this.inputDocument = inputDocument;
    this.featureFlags = featureFlags ?? new NoopFeatureFlagProvider();
    this.schemaHelper = new TransformerSchemaHelper();
  }
}
