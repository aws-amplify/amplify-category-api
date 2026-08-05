import { App, Stack, CfnResource } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { addCfnResourceDependency } from '../utils/cfn-dependency';

const makePair = () => {
  const stack = new Stack(new App(), 'TestStack');
  const target = new CfnResource(stack, 'Target', { type: 'AWS::IAM::Role', properties: {} });
  const source = new CfnResource(stack, 'Source', { type: 'AWS::AppSync::DataSource', properties: {} });
  return { stack, source, target };
};

describe('addCfnResourceDependency', () => {
  it('emits a CloudFormation DependsOn entry', () => {
    const { stack, source, target } = makePair();
    addCfnResourceDependency(source, target);
    const resources = Template.fromStack(stack).toJSON().Resources;
    expect(resources.Source.DependsOn).toEqual([stack.resolve(target.logicalId)]);
  });

  it('prefers addResourceDependency when the installed CDK exposes it', () => {
    const { source, target } = makePair();
    const spy = jest.fn();
    (source as unknown as Record<string, unknown>).addResourceDependency = spy;
    const legacy = jest.spyOn(source, 'addDependency');
    addCfnResourceDependency(source, target);
    expect(spy).toHaveBeenCalledWith(target);
    expect(legacy).not.toHaveBeenCalled();
  });

  it('falls back to addDependency on CDK versions without addResourceDependency', () => {
    const { source, target } = makePair();
    const capable = source as unknown as { addResourceDependency?: unknown };
    const original = capable.addResourceDependency;
    capable.addResourceDependency = undefined;
    const legacy = jest.spyOn(source, 'addDependency');
    addCfnResourceDependency(source, target);
    expect(legacy).toHaveBeenCalledWith(target);
    capable.addResourceDependency = original;
  });
});
