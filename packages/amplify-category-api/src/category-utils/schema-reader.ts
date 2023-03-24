import * as fs from 'fs-extra';
import path from 'path';
import {
  DocumentNode,
  parse,
} from 'graphql';
import {
  $TSAny,
  $TSContext,
  AmplifyError,
  ApiCategoryFacade,
} from 'amplify-cli-core';
import { constructGraphQLTransformV2 } from '../graphql-transformer/transformer-factory';
import {
  SCHEMA_DIR_NAME,
  SCHEMA_FILENAME,
} from '../graphql-transformer/constants';
import { generateTransformerOptions } from '../graphql-transformer/transformer-options-v2';
import { contextUtil } from './context-util';

/**
 * SchemaReader is a utility point to consolidate and abstract GraphQL Schema reading
 * The readSchema method provides a flag to read the un-processed (original) schema
 * if desired, but by default the intent of the SchemaReader is to use the preProcess
 * utility of the V2 transformer
 */
export class SchemaReader {
  private schemaPath: string;
  private schemaDocument: DocumentNode;
  private preProcessedSchemaDocument: DocumentNode;

  getSchemaPath = async (
    resourceDir: string,
  ): Promise<string> => {
    if (this.schemaPath) {
      return this.schemaPath;
    }
    const schemaFilePath = path.normalize(path.join(resourceDir, SCHEMA_FILENAME));
    const schemaDirPath = path.normalize(path.join(resourceDir, SCHEMA_DIR_NAME));

    if (fs.pathExistsSync(schemaFilePath)) {
      this.schemaPath = schemaFilePath;
    } else if (fs.pathExistsSync(schemaDirPath)) {
      this.schemaPath = schemaDirPath;
    } else {
      throw new AmplifyError('ApiCategorySchemaNotFoundError', {
        message: 'No schema found',
        resolution: `Your graphql schema should be in either ${schemaFilePath} or ${schemaDirPath}`,
      });
    }
    return this.schemaPath;
  };

  invalidateCachedSchema = (): void => {
    this.schemaPath = null;
    this.schemaDocument = null;
    this.preProcessedSchemaDocument = null;
  };

  readSchema = async (
    context: $TSContext,
    options: $TSAny,
    usePreProcessing = true,
  ): Promise<DocumentNode> => {
    const preProcessSchema = usePreProcessing && (await ApiCategoryFacade.getTransformerVersion(context) === 2);
    if (!this.schemaDocument) {
      const fileContentsList = new Array<Promise<Buffer>>();
      const resourceDir = await contextUtil.getResourceDir(context, options);
      const schemaPath = await this.getSchemaPath(resourceDir);

      const stats = fs.statSync(schemaPath);
      if (stats.isDirectory()) {
        fs.readdirSync(schemaPath).forEach((fileName) => {
          fileContentsList.push(fs.readFile(path.join(schemaPath, fileName)));
        });
      } else {
        fileContentsList.push(fs.readFile(schemaPath));
      }

      if (!fileContentsList.length) {
        throw new AmplifyError('ApiCategorySchemaNotFoundError', {
          message: 'No schema found',
          resolution: `Your graphql schema should be in ${schemaPath}`,
        });
      }

      const bufferList = await Promise.all(fileContentsList);
      const fullSchema = bufferList.map((buff) => buff.toString()).join('\n');
      this.schemaDocument = parse(fullSchema);
    }

    if (preProcessSchema && !this.preProcessedSchemaDocument) {
      const transformerOptions = await generateTransformerOptions(context, options);
      const transform = await constructGraphQLTransformV2(transformerOptions);
      this.preProcessedSchemaDocument = transform.preProcessSchema(this.schemaDocument);
    }

    return preProcessSchema ? this.preProcessedSchemaDocument : this.schemaDocument;
  };
}

export const schemaReader = new SchemaReader();
