import { graphqlName, toUpper, toCamelCase } from './util';
import { DEFAULT_SCALARS } from './definition';

/**
 *
 */
export class ModelResourceIDs {
  static #modelNameMap: Map<string, string>;

  /**
   * Used to inject a table name mapping that will be used for generated table resource IDs
   * @param modelToTableNameMap
   */
  static setModelNameMap = (modelToTableNameMap: Map<string, string>) => {
    ModelResourceIDs.#modelNameMap = modelToTableNameMap;
  };

  /**
   *
   * @param typeName
   */
  static ModelTableResourceID(typeName: string): string {
    const tableName = this.#modelNameMap?.get(typeName) ?? typeName;
    return `${tableName}Table`;
  }

  /**
   *
   * @param typeName
   */
  static ModelTableStreamArn(typeName: string): string {
    return `${typeName}TableStreamArn`;
  }

  /**
   *
   * @param typeName
   */
  static ModelTableDataSourceID(typeName: string): string {
    return `${typeName}DataSource`;
  }

  /**
   *
   * @param typeName
   */
  static ModelTableIAMRoleID(typeName: string): string {
    return `${typeName}IAMRole`;
  }

  /**
   *
   * @param name
   */
  static ModelFilterInputTypeName(name: string): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `Model${nameOverride}FilterInput`;
    }
    return `Model${name}FilterInput`;
  }

  /**
   *
   * @param name
   * @param includeFilter
   * @param isSubscriptionFilter
   */
  static ModelFilterScalarInputTypeName(name: string, includeFilter: boolean, isSubscriptionFilter = false): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `Model${isSubscriptionFilter ? 'Subscription' : ''}${nameOverride}${includeFilter ? 'Filter' : ''}Input`;
    }
    return `Model${isSubscriptionFilter ? 'Subscription' : ''}${name}${includeFilter ? 'Filter' : ''}Input`;
  }

  /**
   *
   * @param name
   */
  static ModelConditionInputTypeName(name: string): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `Model${nameOverride}ConditionInput`;
    }
    return `Model${name}ConditionInput`;
  }

  /**
   *
   * @param name
   */
  static ModelKeyConditionInputTypeName(name: string): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `Model${nameOverride}KeyConditionInput`;
    }
    return `Model${name}KeyConditionInput`;
  }

  /**
   *
   * @param keyFieldNames
   */
  static ModelCompositeKeyArgumentName(keyFieldNames: string[]) {
    return toCamelCase(keyFieldNames.map((n) => graphqlName(n)));
  }

  /**
   *
   */
  static ModelCompositeKeySeparator() {
    return '#';
  }

  /**
   *
   * @param keyFieldNames
   */
  static ModelCompositeAttributeName(keyFieldNames: string[]) {
    return keyFieldNames.join(ModelResourceIDs.ModelCompositeKeySeparator());
  }

  /**
   *
   * @param modelName
   * @param keyName
   */
  static ModelCompositeKeyConditionInputTypeName(modelName: string, keyName: string): string {
    return `Model${modelName}${keyName}CompositeKeyConditionInput`;
  }

  /**
   *
   * @param modelName
   * @param keyName
   */
  static ModelCompositeKeyInputTypeName(modelName: string, keyName: string): string {
    return `Model${modelName}${keyName}CompositeKeyInput`;
  }

  /**
   *
   * @param name
   * @param includeFilter
   * @param isSubscriptionFilter
   */
  static ModelFilterListInputTypeName(name: string, includeFilter: boolean, isSubscriptionFilter = false): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `Model${isSubscriptionFilter ? 'Subscription' : ''}${nameOverride}List${includeFilter ? 'Filter' : ''}Input`;
    }
    return `Model${isSubscriptionFilter ? 'Subscription' : ''}${name}List${includeFilter ? 'Filter' : ''}Input`;
  }

  /**
   *
   * @param name
   * @param includeFilter
   */
  static ModelScalarFilterInputTypeName(name: string, includeFilter: boolean): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `Model${nameOverride}${includeFilter ? 'Filter' : ''}Input`;
    }
    return `Model${name}${includeFilter ? 'Filter' : ''}Input`;
  }

  /**
   *
   * @param typeName
   */
  static ModelConnectionTypeName(typeName: string): string {
    return `Model${typeName}Connection`;
  }

  /**
   *
   * @param typeName
   */
  static IsModelConnectionType(typeName: string): boolean {
    return /^Model.*Connection$/.test(typeName);
  }

  /**
   *
   * @param typeName
   */
  static GetModelFromConnectionType(typeName: string): string {
    return /(?<=Model)(.*)(?=Connection)/.exec(typeName)?.[0];
  }

  /**
   *
   * @param typeName
   */
  static ModelDeleteInputObjectName(typeName: string): string {
    return graphqlName(`Delete${toUpper(typeName)}Input`);
  }

  /**
   *
   * @param typeName
   */
  static ModelUpdateInputObjectName(typeName: string): string {
    return graphqlName(`Update${toUpper(typeName)}Input`);
  }

  /**
   *
   * @param typeName
   */
  static ModelCreateInputObjectName(typeName: string): string {
    return graphqlName(`Create${toUpper(typeName)}Input`);
  }

  /**
   *
   * @param typeName
   */
  static ModelOnCreateSubscriptionName(typeName: string): string {
    return graphqlName(`onCreate${toUpper(typeName)}`);
  }

  /**
   *
   * @param typeName
   */
  static ModelOnUpdateSubscriptionName(typeName: string): string {
    return graphqlName(`onUpdate${toUpper(typeName)}`);
  }

  /**
   *
   * @param typeName
   */
  static ModelOnDeleteSubscriptionName(typeName: string): string {
    return graphqlName(`onDelete${toUpper(typeName)}`);
  }

  /**
   *
   */
  static ModelAttributeTypesName(): string {
    return `ModelAttributeTypes`;
  }

  /**
   *
   */
  static ModelSizeInputTypeName(): string {
    return `ModelSizeInput`;
  }

  /**
   *
   * @param typeName
   */
  static NonModelInputObjectName(typeName: string): string {
    return graphqlName(`${toUpper(typeName)}Input`);
  }

  /**
   *
   * @param typeName
   * @param fieldName
   */
  static UrlParamsInputObjectName(typeName: string, fieldName: string) {
    return graphqlName(`${toUpper(typeName) + toUpper(fieldName)}ParamsInput`);
  }

  /**
   *
   * @param typeName
   * @param fieldName
   */
  static HttpQueryInputObjectName(typeName: string, fieldName: string) {
    return graphqlName(`${toUpper(typeName) + toUpper(fieldName)}QueryInput`);
  }

  /**
   *
   * @param typeName
   * @param fieldName
   */
  static HttpBodyInputObjectName(typeName: string, fieldName: string) {
    return graphqlName(`${toUpper(typeName) + toUpper(fieldName)}BodyInput`);
  }
}
