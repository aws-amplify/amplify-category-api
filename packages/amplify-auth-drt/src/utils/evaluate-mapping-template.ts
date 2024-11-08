import {
  AppSyncClient,
  EvaluateMappingTemplateCommand,
  EvaluateMappingTemplateCommandInput,
  EvaluateMappingTemplateCommandOutput,
} from '@aws-sdk/client-appsync';
import { AppSyncContext, makeContext } from './appsync-context';

export interface EvaluateMappingTemplateOptions {
  partialContext?: Partial<AppSyncContext>;
  region: string;
  template: string;
}

export const evaluateMappingTemplate = async (options: EvaluateMappingTemplateOptions): Promise<EvaluateMappingTemplateCommandOutput> => {
  const { partialContext, region, template } = options;
  const client = new AppSyncClient({ region });
  const input: EvaluateMappingTemplateCommandInput = {
    template,
    context: JSON.stringify(makeContext(partialContext)),
  };
  const command = new EvaluateMappingTemplateCommand(input);
  const result = await client.send(command);
  return result;
};
