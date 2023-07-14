import { DocumentNode } from 'graphql';
import { TransformerSchemaHelperProvider } from './schema-helper-provider';
import { TransformParameters } from './transform-parameters';

export interface TransformerPreProcessContextProvider {
  inputDocument: DocumentNode;
  transformParameters: TransformParameters;
  schemaHelper: TransformerSchemaHelperProvider;
}
