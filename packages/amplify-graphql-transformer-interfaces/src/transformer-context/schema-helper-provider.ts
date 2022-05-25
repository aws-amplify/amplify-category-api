export interface TransformerSchemaHelperProvider {
  /**
   * Used for @mapsTo, this method is used to define a type mapping where the
   * name of the type has changed but the underlying Table name has not changed
   * @param originalTypeName
   * @param newTypeName
   */
  setTypeMapping: (newTypeName: string, originalTypeName: string) => void;
  /**
   * Used for @mapsTo, this method maps a new type name defined in a schema to
   * the original type name of the underlying Table
   * @param newTypeName
   */
  getTypeMapping: (newTypeName: string) => string;
}
