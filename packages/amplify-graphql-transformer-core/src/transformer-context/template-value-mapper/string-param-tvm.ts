import { createHash } from 'crypto';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { TemplateValueMapper } from '@aws-amplify/graphql-transformer-interfaces';
import { StringParameterTemplateValueMapperConstruct } from './string-param-tvm-construct';

/**
 * A template mapper that uses an SSM {@link StringParameter} to map the original stack's value to the local stack.
 *
 * - During mapping template generation:
 *     - Create a placeholder marker in the mapping template itself (e.g., `<<AMPLIFY_MARKER:myKey>`)
 *     - Maintain a mapping of marker to resource value in the transformer context
 * - During custom resource manager creation:
 *     - For each entry in the marker-to-resource map, create an SSM parameter
 *     - Replace the marker in the mapping template with the stringValue of the SSM parameter
 *
 * Now:
 * - Template author writes the mapping template string, creating an Amplify-specific placeholder value in the context:
 *     ```
 *     const mappingTemplate = `$util.qr($ctx.stash.metadata.put("apiId", "${ctx.createInterpolatedValue('apiId', api.apiId)}"))`;
 *     ```
 * - Amplify stores the value in a map, and puts an Amplify-specific placeholder token in the template. The CDK synth token is stored in
 *   that map:
 *     ```
 *     template: $util.qr($ctx.stash.metadata.put("apiId", "<<AMPLIFY_MARKER:apiId>>"))
 *     map: {apiId: "${TOKEN[ABC123]}"}
 *     ```
 * - During creation of the custom resource, Amplify creates an SSM parameter for each member of the map, and does a global search/replace
 *   on all string values:
 *     ```
 *     const apiIdSsmParameter = new StringParameter(scope, `DeploymentValueWorkaround${apiId}`, {stringValue: "${TOKEN[ABC123]}"})
 *     template.replaceAll(/<<AMPLIFY_MARKER:apiId>>/g, apiIdSsmParameter.stringValue)
 *     template: $util.qr($ctx.stash.metadata.put("apiId", "${TOKEN[DEF987]}"))
 *     ```
 * - Bucket deployment replaces that token with a purpose-built marker
 *     ```
 *     template: $util.qr($ctx.stash.metadata.put("apiId", "<<marker:0xbaba:1>>"))
 *     ```
 * - Bucket deployment correctly resolves the marker to the in-stack SSM parameter string value
 */
export class StringParameterTemplateValueMapper implements TemplateValueMapper {
  private markerPrefix = 'MARKER_DefaultTemplateValueMapper';

  private construct: StringParameterTemplateValueMapperConstruct | undefined;

  constructor(private tokenMap: Record<string, string> = {}) {}

  public readonly add = (key: string, value: string): string => {
    this.tokenMap[key] = value;
    return this.makeMarker(key);
  };

  public readonly bind = (scope: Construct, id: string): Construct => {
    const construct = new StringParameterTemplateValueMapperConstruct(scope, id);
    Object.entries(this.tokenMap).forEach(([key, value]) => {
      construct!.parameterMap[key] = new StringParameter(construct!, `TemplateValueMapper${this.normalizeStringParameterKey(key)}`, {
        stringValue: value,
      });
    });
    this.construct = construct;
    return construct;
  };

  public readonly resolve = (content: string): string => {
    const construct = this.construct;
    if (!construct) {
      throw new Error('Construct has not been bound. Invoke `bind` with the scope of the DeploymentBucket');
    }
    Object.entries(construct.parameterMap).forEach(([key, parameter]) => {
      content = content.replaceAll(this.makeMarker(key), parameter.stringValue);
    });
    return content;
  };

  private makeMarker = (key: string): string => `<<${this.markerPrefix}:${key}>>`;

  private normalizeStringParameterKey = (key: string) => {
    const hash = createHash('sha256').update(key).digest('base64url').substring(0, 8);
    const normalizedKey = key.replaceAll(/[^A-Za-z0-9_-]/g, '');
    return `${normalizedKey}${hash}`;
  };
}
