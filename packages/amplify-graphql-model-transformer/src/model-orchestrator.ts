import { modelDirectiveDefinition } from './graphql-model-transformer-generic';
import { directiveDefinition } from './graphql-model-transformer';

export type ModelDefinitionOptions = {
  directiveRename?: string;
}

export class ModelOrchestrator {
  private modelPluginDefinitions: Map<string, string> = new Map<string, string>();

  /**
   * Returns the string GraphQL definition for the given model plugin. Written to avoid duplication of input types.
   * WARNING: This is not a thread safe function. It relies on the plugins being constructed in sequence
   * @param modelPlugin the name of the model plugin
   */
  getModelPluginDefinition(modelPlugin: string, options?: ModelDefinitionOptions): string {
    if (!this.modelPluginDefinitions.has(modelPlugin)) {
      if (this.modelPluginDefinitions.size > 0) {
        this.modelPluginDefinitions.set(modelPlugin, modelDirectiveDefinition);
      } else {
        this.modelPluginDefinitions.set(modelPlugin, directiveDefinition);
      }
    }
    if (options?.directiveRename) {
      this.modelPluginDefinitions.set(
        modelPlugin,
        <string> this.modelPluginDefinitions.get(modelPlugin)?.replace('@model', `@${options.directiveRename}`),
      );
    }
    return <string> this.modelPluginDefinitions.get(modelPlugin);
  }
}

export const modelOrchestrator = new ModelOrchestrator();
