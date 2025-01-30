/* c8 ignore start */
export type AmplifyDsqlClusterStatus = 'CREATING' | 'ACTIVE' | 'UPDATING' | 'DELETING' | 'DELETED' | 'FAILED';

/* c8 ignore end */

/* c8 ignore start */
/**
 * Response elements of https://docs.aws.amazon.com/aurora-dsql/latest/APIReference/API_GetCluster.html, encapsulated for inclusion in a
 * `resources` element
 */
export interface IAmplifyDsqlDatabaseCluster {
  /**
   * The ARN of the database cluster
   */
  readonly arn: string;

  /**
   * The time when the cluster was created
   */
  readonly creationTime: number;

  /**
   * Whether deletion protection is enabled in this cluster
   */
  readonly deletionProtectionEnabled: boolean;

  /**
   * The ID of the retrieved cluster
   */
  readonly identifier: string;

  /**
   * The ARNs of the clusters linked to the retrieved cluster
   */
  readonly linkedClusterArns: string[];

  /**
   * The status of the retrieved cluster
   */
  readonly status: AmplifyDsqlClusterStatus;

  /**
   * The witness Region of the cluster. Applicable only for multi-Region clusters
   */
  readonly witnessRegion: string;
}
/* c8 ignore stop */

/* c8 ignore start */
/**
 * Input props for the AmplifyDatabase construct.
 */
export interface AmplifyDatabaseProps {
  /**
   * If enabled, you can't delete your cluster. You must first disable this property before you can delete your cluster. Defaults to `false`
   */
  readonly deletionProtectionEnabled?: boolean;

  /**
   * The name of the cluster as reported in the console. This will be propagated to a `Name` tag.
   */
  readonly name: string;

  /**
   * A map of key/value pairs to use to tag your cluster. Maximum 175 items. Amplify will add some tags by default, including a `Name` tag
   * filled with the value of the {@link name} property.
   */
  readonly tags?: Record<string, string>;
}
/* c8 ignore stop */

/* c8 ignore start */
export interface AmplifyDatabaseResources {
  /**
   * The database cluster created by the construct.
   */
  readonly databaseCluster: IAmplifyDsqlDatabaseCluster;
}
/* c8 ignore stop */
