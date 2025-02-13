import { Construct } from 'constructs';
import { TemplateValueMapper } from '@aws-amplify/graphql-transformer-interfaces';

/**
 * A {@link TemplateValueMapper} implementation that simply interpolates the value directly into the content as-is. Suitable for use cases
 * that don't ultimately rely on a BucketDeployment workaround to resolve values. (In other words, this will be useful when either the
 * BucketDeployment bug is fixed, or for use cases that don't use an AWSCustomResource to manage AppSync functions and resolvers.)
 */
export class PassthroughTemplateValueMapper implements TemplateValueMapper {
  /**
   * Returns `value` as-is, with no intermediate transformation
   */
  add = (_: string, value: string): string => value;

  /**
   * Returns an empty Construct bound to `scope`
   */
  bind = (scope: Construct, id: string): Construct => new Construct(scope, id);

  /**
   * No-op: returns `content` as-is
   */
  resolve = (content: string): string => content;
}
