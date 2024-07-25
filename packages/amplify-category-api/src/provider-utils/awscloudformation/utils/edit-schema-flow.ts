import * as path from 'path';
import { $TSContext, pathManager } from '@aws-amplify/amplify-cli-core';
import { prompter } from '@aws-amplify/amplify-prompts';
import { category } from '../../../category-constants';
import { gqlSchemaFilename } from '../aws-constants';

export const editSchemaFlow = async (context: $TSContext, apiName: string) => {
  if (!(await prompter.yesOrNo('Do you want to edit the schema now?', true))) {
    return;
  }

  const schemaPath = path.join(pathManager.getResourceDirectoryPath(undefined, category, apiName), gqlSchemaFilename);
  await context.amplify.openEditor(context, schemaPath, false);
};
