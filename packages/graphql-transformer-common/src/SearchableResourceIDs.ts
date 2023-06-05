import { DEFAULT_SCALARS } from './definition';

/**
 *
 */
export class SearchableResourceIDs {
  /**
   *
   * @param typeName
   */
  static SearchableEventSourceMappingID(typeName: string): string {
    return `Searchable${typeName}LambdaMapping`;
  }

  /**
   *
   * @param name
   */
  static SearchableFilterInputTypeName(name: string): string {
    const nameOverride = DEFAULT_SCALARS[name];
    if (nameOverride) {
      return `Searchable${nameOverride}FilterInput`;
    }
    return `Searchable${name}FilterInput`;
  }
}
