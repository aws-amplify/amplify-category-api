import { resourceName } from './util';

/**
 *
 */
export class ResolverResourceIDs {
  /**
   *
   * @param typeName
   */
  static DynamoDBCreateResolverResourceID(typeName: string): string {
    return `Create${resourceName(typeName)}Resolver`;
  }

  /**
   *
   * @param typeName
   */
  static DynamoDBUpdateResolverResourceID(typeName: string): string {
    return `Update${resourceName(typeName)}Resolver`;
  }

  /**
   *
   * @param typeName
   */
  static DynamoDBDeleteResolverResourceID(typeName: string): string {
    return `Delete${resourceName(typeName)}Resolver`;
  }

  /**
   *
   * @param typeName
   */
  static DynamoDBGetResolverResourceID(typeName: string): string {
    return `Get${resourceName(typeName)}Resolver`;
  }

  /**
   *
   * @param typeName
   */
  static DynamoDBListResolverResourceID(typeName: string): string {
    return `List${resourceName(typeName)}Resolver`;
  }

  /**
   *
   * @param typeName
   */
  static ElasticsearchSearchResolverResourceID(typeName: string): string {
    return `Search${resourceName(typeName)}Resolver`;
  }

  /**
   *
   * @param typeName
   */
  static SyncResolverResourceID(typeName: string): string {
    return `Sync${resourceName(typeName)}Resolver`;
  }

  /**
   *
   * @param typeName
   * @param fieldName
   */
  static ResolverResourceID(typeName: string, fieldName: string): string {
    return `${resourceName(`${typeName}${fieldName}`)}Resolver`;
  }
}
