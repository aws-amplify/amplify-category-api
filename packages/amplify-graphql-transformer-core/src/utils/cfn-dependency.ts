import { CfnResource } from 'aws-cdk-lib';

type ResourceDependencyCapable = { addResourceDependency?: (target: CfnResource) => void };

/**
 * Declares that `source` depends on `target`, emitting a CloudFormation `DependsOn` entry.
 *
 * aws-cdk-lib >= 2.262.0 renamed `CfnResource#addDependency` to `addResourceDependency` and
 * deprecated the old name (jsii emits a runtime deprecation warning). Older versions do not
 * expose `addResourceDependency` at all. Feature-detecting at runtime keeps this library
 * warning-free on new CDK while remaining compatible with older supported versions.
 *
 * @param source the resource that depends on `target`
 * @param target the resource that must be created first
 */
export const addCfnResourceDependency = (source: CfnResource, target: CfnResource): void => {
  const candidate = source as unknown as ResourceDependencyCapable;
  if (typeof candidate.addResourceDependency === 'function') {
    candidate.addResourceDependency(target);
  } else {
    source.addDependency(target);
  }
};
