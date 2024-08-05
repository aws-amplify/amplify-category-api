import { Engine } from './engine';
import { Model } from './types';

export class Schema {
  private models: Model[] = [];

  constructor(private engine: Engine) {}

  public getModels(): Model[] {
    return this.models;
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public addModel(model: Model): void {
    const modelName = model.getName();
    if (this.hasModel(modelName)) {
      throw new Error(`Model "${modelName}" already exists`);
    }
    this.models.push(model);
  }

  public hasModel(name: string): boolean {
    return this.models.some((model) => model.getName() === name);
  }
}
