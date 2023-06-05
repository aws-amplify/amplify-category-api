import { getAmplifyMeta } from './index';

/**
 *
 */
export class ConfigOverrideManager {
  private static instance: ConfigOverrideManager = null;
  private overrides: {};
  private amplifyMeta: any = {};
  constructor(context) {
    this.overrides = {};
    context.amplify.addCleanUpTask(async (context) => {
      await this.restoreFrontendExports(context);
    });
  }

  /**
   *
   * @param category
   */
  addOverride(category: string, override: {}) {
    this.overrides[category] = override;
  }

  /**
   *
   * @param context
   */
  async generateOverriddenFrontendExports(context) {
    const meta = await getAmplifyMeta(context);
    await context.amplify.onCategoryOutputsChange(context, null, {
      ...meta,
      ...this.overrides,
    });
  }

  /**
   *
   * @param context
   */
  async restoreFrontendExports(context) {
    await context.amplify.onCategoryOutputsChange(context, null, this.amplifyMeta);
  }

  /**
   *
   * @param context
   */
  static async getInstance(context: any): Promise<ConfigOverrideManager> {
    if (!ConfigOverrideManager.instance) {
      const configOverrideManager = new ConfigOverrideManager(context);
      configOverrideManager.amplifyMeta = await getAmplifyMeta(context);
      ConfigOverrideManager.instance = configOverrideManager;
    }
    return ConfigOverrideManager.instance;
  }
}
