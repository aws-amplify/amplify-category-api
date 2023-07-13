import { TransformerSchemaHelperProvider } from '@aws-amplify/graphql-transformer-interfaces';

export class TransformerSchemaHelper implements TransformerSchemaHelperProvider {
  private typeMap: Map<string, string> = new Map<string, string>();

  setTypeMapping = (newTypeName: string, originalTypeName: string) => {
    if (this.typeMap.has(newTypeName)) {
      throw new Error(
        `Type ${newTypeName} has already been mapped to ${this.typeMap.get(newTypeName)}, and cannot be mapped to ${originalTypeName}`,
      );
    }
    this.typeMap.set(newTypeName, originalTypeName);
  };

  getTypeMapping = (newTypeName: string) => {
    return this.typeMap.get(newTypeName) ?? newTypeName;
  };
}
