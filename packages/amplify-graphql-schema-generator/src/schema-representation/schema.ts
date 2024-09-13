import { Model,EnumType } from './types';
import { Engine } from './engine';

export class Schema {
  private models: Model[] = [];
  private enums: EnumType[] = [];

  constructor(private engine: Engine) {}

  public getModels(): Model[] {
    return this.models;
  }

  public getEngine(): Engine {
    return this.engine;
  }

  public getEnums(): EnumType[] {
    return this.enums;
  }

  public addModel(model: Model): void {
    console.log(this.engine);
    const modelName = model.getName();
    if (this.hasModel(modelName)) {
      throw new Error(`Model "${modelName}" already exists`);
    }
    // const fields = model.fields
    this.models.push(model);
  }

  // public addEnums(e: EnumType): void {
  //   if(this.engine.type === 'Postgres') {
  //     const models = this.models;
  //     this.enums

  //   }
  //   else{

  //   }
  // }

  public hasModel(name: string): boolean {
    return this.models.some((model) => model.getName() === name);
  }
}
