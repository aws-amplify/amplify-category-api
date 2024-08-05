import {
  GraphQLAPIProvider,
  ModelFieldMap,
  SynthParameters,
  TransformerResourceHelperProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { Token } from 'aws-cdk-lib';
import { DirectiveNode, FieldNode, ObjectTypeDefinitionNode, ObjectTypeExtensionNode } from 'graphql';
import { ModelResourceIDs } from 'graphql-transformer-common';
import md5 from 'md5';
import { ModelFieldMapImpl } from './model-field-map';

/**
 * Contains helper methods for transformers to access and compile context about resource generation
 */
export class TransformerResourceHelper implements TransformerResourceHelperProvider {
  private api?: GraphQLAPIProvider;

  private exclusionSet = new Set<string>();

  // a mapping of models that have been renamed with @mapsTo
  readonly #modelNameMap = new Map<string, string>();

  // a map of objects that define fields of a model that are renamed
  readonly #modelFieldMaps = new Map<string, ModelFieldMap>();

  constructor(private synthParameters: SynthParameters) {
    // set the model name mapping in ModelResourceIDs to use the same mapping as this class
    // yes, it would be better if ModelResourceIDs didn't have a bunch of static methods and this map could be injected into that class
    // but it would also be better if I could eat chocolate cake all day
    ModelResourceIDs.setModelNameMap(this.#modelNameMap);
  }

  /**
   * Given a modelName, get the corresponding table name
   */
  generateTableName = (modelName: string): string => {
    if (!this.api) {
      throw new Error('API not initialized');
    }
    const env = this.synthParameters.amplifyEnvironmentName;
    const { apiId } = this.api!;
    const baseName = this.#modelNameMap.get(modelName) ?? modelName;
    return `${baseName}-${apiId}-${env}`;
  };

  public generateIAMRoleName = (name: string): string => {
    if (!this.api) {
      throw new Error('API not initialized');
    }
    const env = this.synthParameters.amplifyEnvironmentName;
    const { apiId } = this.api!;
    // 38 = 26(apiId) + 10(env) + 2(-)
    const shortName = `${Token.isUnresolved(name) ? name : name.slice(0, 64 - 38 - 6)}${md5(name).slice(0, 6)}`;
    return `${shortName}-${apiId}-${env}`; // max of 64.
  };

  /**
   * binds api to Resource helper class
   */
  bind(api: GraphQLAPIProvider): void {
    this.api = api;
  }

  /**
   * Registers a mapping of a current modelName to an original mappedName
   * @param modelName The current model name in the schema
   * @param mappedName The original model name as specified by @mapsTo
   */
  setModelNameMapping = (modelName: string, mappedName: string): void => {
    this.#modelNameMap.set(modelName, mappedName);
  };

  /**
   * Gets the mapped name of a model, if present in the map. Otherwise, returns the given model name unchanged
   */
  getModelNameMapping = (modelName: string): string => this.#modelNameMap.get(modelName) ?? modelName;

  /**
   * True if the model name has a mapping, false otherwise
   */
  isModelRenamed = (modelName: string): boolean => this.getModelNameMapping(modelName) !== modelName;

  /**
   * Gets the field mapping object for the model if present. If not present, an new field map object is created and returned
   */
  getModelFieldMap = (modelName: string): ModelFieldMap => {
    if (!this.#modelFieldMaps.has(modelName)) {
      this.#modelFieldMaps.set(modelName, new ModelFieldMapImpl());
    }
    return this.#modelFieldMaps.get(modelName)!;
  };

  /**
   * Gets the mapped name of a model field, if present. Otherwise, returns the given field name unchanged.
   */
  getFieldNameMapping = (modelName: string, fieldName: string): string => {
    if (!this.#modelFieldMaps.has(modelName)) {
      return fieldName;
    }
    return (
      this.#modelFieldMaps
        .get(modelName)
        ?.getMappedFields()
        .find((entry) => entry.currentFieldName === fieldName)?.originalFieldName || fieldName
    );
  };

  /**
   * Gets a list of all the model names that have an entry in the field map
   */
  getModelFieldMapKeys = (): string[] => [...this.#modelFieldMaps.keys()];

  /**
   * In some cases a directive may be added to a schema during preprocessing for the sake of external use, but should be ignored by the
   * transformer itself. This method is used to define a specific instance/configuration of a directive that should be ignored during
   * the transformation process
   * @param object the parent object of the directive (whether directive is on field or type)
   * @param field the field the directive is on (if the directive is on a field)
   * @param directive the directive
   */
  addDirectiveConfigExclusion = (
    object: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
    field: FieldNode | undefined,
    directive: DirectiveNode,
  ): void => {
    this.exclusionSet.add(this.convertDirectiveConfigToKey(object, field, directive));
  };

  /**
   * In the cases where a directive configuration is excluded, this method returns true
   * @param object the parent object of the directive (whether directive is on field or type)
   * @param field the field the directive is on (if the directive is on a field)
   * @param directive the directive
   * @return boolean true if the configuration has been excluded
   */
  isDirectiveConfigExcluded = (
    object: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
    field: FieldNode | undefined,
    directive: DirectiveNode,
  ): boolean => {
    return this.exclusionSet.has(this.convertDirectiveConfigToKey(object, field, directive));
  };

  private convertDirectiveConfigToKey = (
    object: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
    field: FieldNode | undefined,
    directive: DirectiveNode,
  ): string => {
    const argString = directive?.arguments
      ?.map((arg) => {
        return `${arg?.name?.value}|${
          arg?.value?.kind === 'StringValue' || arg?.value?.kind === 'IntValue' || arg?.value?.kind === 'FloatValue'
            ? arg.value.value
            : 'NullValue'
        }`;
      })
      ?.join('-');
    return `${object.name.value}/${field?.name?.value ?? 'NullField'}/${directive.name.value}/${argString}`;
  };
}
