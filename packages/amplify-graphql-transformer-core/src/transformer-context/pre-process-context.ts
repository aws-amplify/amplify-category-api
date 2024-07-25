import { TransformerPreProcessContextProvider, TransformerSchemaHelperProvider } from '@aws-amplify/graphql-transformer-interfaces';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';
import { DocumentNode } from 'graphql';
import { TransformerSchemaHelper } from './schema-helper';

export class TransformerPreProcessContext implements TransformerPreProcessContextProvider {
  inputDocument: DocumentNode;

  transformParameters: TransformParameters;

  schemaHelper: TransformerSchemaHelperProvider;

  constructor(inputDocument: DocumentNode, transformParameters: TransformParameters) {
    this.inputDocument = inputDocument;
    this.transformParameters = transformParameters;
    this.schemaHelper = new TransformerSchemaHelper();
  }
}
