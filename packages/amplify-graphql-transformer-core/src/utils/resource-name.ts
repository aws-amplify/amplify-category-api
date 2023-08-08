import { Construct, MetadataEntry } from 'constructs';

const resourceNameKey = 'graphqltransformer:resourceName';

export type SetResourceNameProps = {
  name: string;
  setOnDefaultChild?: boolean;
};

/**
 * Set a resource name on a provided construct.
 * @param scope the construct to set hte resource name on.
 * @param props.name the name to set.
 * @param props.setOnDefaultChild whether to set in the defaultChild or not.
 */
export const setResourceName = (scope: Construct, { name, setOnDefaultChild }: SetResourceNameProps): void => {
  scope.node.addMetadata(resourceNameKey, name);
  if (setOnDefaultChild && scope.node.defaultChild && scope.node.defaultChild) {
    scope.node.defaultChild.node.addMetadata(resourceNameKey, name);
  }
};

/**
 * Retrieve
 * @param metadata the metadata to attempt and pull the resource name
 * @returns the resource name if found, else undefined value
 */
const tryAndRetrieveResourceName = (metadata: MetadataEntry): string | undefined =>
  metadata.type === resourceNameKey && typeof metadata.data === 'string' ? metadata.data : undefined;

/**
 * Utility method to filter undefined values, and winnow string types down.
 * @param x the value to check
 * @returns a boolean and type hint indicating if the value is defined
 */
const isDefined = (x: string | undefined): x is string => x !== undefined;

/**
 * Retrieve the resource name for a given resource if one can be found.
 * @param scope the construct to check for a resource name
 * @returns the resource name as a string if found, else undefined
 */
export const getResourceName = (scope: Construct): string | undefined => {
  const referencesWithName = scope.node.metadata.map(tryAndRetrieveResourceName).filter(isDefined);
  if (referencesWithName.length > 1) throw new Error('Multiple metadata entries specifying a resource name were found, expected 0 or 1.');
  return referencesWithName.length === 1 ? referencesWithName[0] : undefined;
};
