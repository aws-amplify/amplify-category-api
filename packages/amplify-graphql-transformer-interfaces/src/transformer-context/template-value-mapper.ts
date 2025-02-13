import { Construct } from 'constructs';

/**
 * Because of a [CDK bug](https://github.com/aws/aws-cdk/issues/22843), CDK {@link BucketDeployment}s do not properly resolve cross-stack
 * resource references. That means we can't directly reference CDK resources in our mapping templates.
 *
 * For example, consider a template author who wishes to inject the `apiId` of the GraphQL API into a mapping template:
 * - Template author writes the mapping template string, interpolating the Construct's attribute, as in:
 *     ```
 *     const mappingTemplate = `$util.qr($ctx.stash.metadata.put("apiId", "${api.apiId}"))`;
 *     ```
 * - At synth time, the value `api.apiId` is a CDK token to be resolved at deploy time, so that is the actual value interpolated into the
 *   string:
 *     ```
 *     template: $util.qr($ctx.stash.metadata.put("apiId", "${TOKEN[ABC123]}"))
 *     ```
 * - Bucket deployment replaces that token with a purpose-built marker
 *     ```
 *     template: $util.qr($ctx.stash.metadata.put("apiId", "<<marker:0xbaba:0>>"))
 *     ```
 * - Bucket deployment fails to resolve the marker to the cross-stack resource token
 *
 * Instead, we must adopt a strategy for replacing CDK Tokens from the source stack with "translations" to the stack containing the
 * BucketDeployment itself.
 *
 * This interface declares the API for using a TemplateValueMapper, but implementations may vary in their underlying strategies.
 *
 * ### Usage
 * ```
 * let tvm: TemplateValueMapper;
 * let scopeOfBucketDeployment: Construct;
 *
 * const mappingTemplate = `$util.qr($ctx.stash.metadata.put("apiId", "${tvm.add('apiId', api.apiId)}"))`;
 * // mappingTemplate == '$util.qr($ctx.stash.metadata.put("apiId", "<<SOME_MARKER_VALUE>>"))'
 * tvm.bind(scopeOfBucketDeployment, 'MyBucketDeploymentMapper');
 * const config = {
 *   resolvedMappingTemplate: tvm.resolve(mappingTemplate)
 * };
 *
 * const bucketDeploymentSource = Source.jsonData('config.json', config);
 * ```
 */
export interface TemplateValueMapper {
  /**
   * Adds a key/value marker to the template, remembering the pair for future resolution according to its particular strategy. This method
   * returns a marker that the implementation can later replace with a resolved synth value. Markers are opaque, and not guaranteed to be
   * stable between invocations of `cdk synth`. That means that these markers cannot be used to guarantee that a resource has not changed.
   *
   * @param key a unique key for the map
   * @param value a CDK Token to be resolved during deployment of the {@link BucketDeployment}
   * @returns a marker value to be interpolated into the content
   */
  readonly add: (key: string, value: string) => string;

  /**
   * Binds the TemplateValueMapper to the specified scope. The scope should be in the same stack as the {@link BucketDeployment} that this
   * mapper is being used to work around. This method is required because any underlying implementation must create some kind of resource
   * that maps the original stack's CDK Token to a value that is bound to the same stack as the BucketDeployment.
   * @param scope a scope in the same stack as the targeted BucketDeployment
   * @param id a unique id for the construct
   * @returns a construct that contains any underlying resources the implementation uses for resolving the CDK values
   */
  readonly bind: (scope: Construct, id: string) => Construct;

  /**
   * Resolves content that has been decorated with markers by calling the {@link add} method by replacing temporary markers with resolved
   * synth values.
   * @param content the content to resolve
   * @returns the content with markers replaced with synth values
   */
  readonly resolve: (content: string) => string;
}
