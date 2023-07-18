import { StackManagerProvider, Template, TransformerResolverProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { App, Stack, CfnParameter, CfnParameterProps, NestedStack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TransformerNestedStack, TransformerRootStack, TransformerStackSythesizer } from '../cdk-compat';

export type ResourceToStackMap = Record<string, string>;

export type TransformResourceProvider = {
  getCloudFormationTemplates: () => Map<string, Template>;
  getMappingTemplates: () => Map<string, string>;
  getResolvers: () => Map<string, TransformerResolverProvider>;
};

/**
 * StackManager
 */
export class StackManager implements StackManagerProvider {
  private stacks: Map<string, Stack> = new Map();
  private childStackSynthesizers: Map<string, TransformerStackSythesizer> = new Map();
  private stackSynthesizer = new TransformerStackSythesizer();
  public readonly rootStack: Construct;
  private resourceToStackMap: Map<string, string>;
  private paramMap: Map<string, CfnParameter> = new Map();
  private useInternalSynth: boolean;

  constructor(scope: Construct, resourceMapping: ResourceToStackMap) {
    this.useInternalSynth = App.isApp(scope);
    this.rootStack = this.useInternalSynth
      ? new TransformerRootStack(scope, 'transformer-root-stack', {
          synthesizer: this.stackSynthesizer,
        })
      : scope; // TK: Can we use our own synthesizer here, is that helpful?
    // add Env Parameter to ensure to adhere to contract
    this.resourceToStackMap = new Map(Object.entries(resourceMapping));
    this.addParameter('env', {
      default: 'NONE',
      type: 'String',
    });
  }

  createStack = (stackName: string): Stack => {
    if (this.useInternalSynth) {
      const synthesizer = new TransformerStackSythesizer();
      const newStack = new TransformerNestedStack(this.rootStack, stackName, {
        synthesizer,
      });
      this.childStackSynthesizers.set(stackName, synthesizer);
      this.stacks.set(stackName, newStack);
      return newStack;
    }
    const newStack = new NestedStack(this.rootStack, stackName);
    this.stacks.set(stackName, newStack);
    return newStack;
  };

  hasStack = (stackName: string): boolean => this.stacks.has(stackName);

  getStackFor = (resourceId: string, defaultStackName?: string): Construct => {
    const stackName = this.resourceToStackMap.has(resourceId) ? this.resourceToStackMap.get(resourceId) : defaultStackName;
    if (!stackName) {
      return this.rootStack;
    }
    if (this.hasStack(stackName)) {
      return this.getStack(stackName);
    }
    return this.createStack(stackName);
  };

  getStack = (stackName: string): Stack => {
    if (this.stacks.has(stackName)) {
      return this.stacks.get(stackName)!;
    }
    throw new Error(`Stack ${stackName} is not created`);
  };

  getCloudFormationTemplates = (): Map<string, Template> => {
    if (!this.useInternalSynth) {
      throw new Error('External synthesis does not support getting cloudformation templates');
    }
    let stacks = this.stackSynthesizer.collectStacks();
    this.childStackSynthesizers.forEach((synthesizer) => {
      stacks = new Map([...stacks.entries(), ...synthesizer.collectStacks()]);
    });
    return stacks;
  };

  getMappingTemplates = (): Map<string, string> => {
    if (!this.useInternalSynth) {
      throw new Error('External synthesis does not support getting mapping templates');
    }
    return this.stackSynthesizer.collectMappingTemplates();
  };

  addParameter = (name: string, props: CfnParameterProps): CfnParameter => {
    const param = new CfnParameter(this.rootStack, name, props);
    this.paramMap.set(name, param);
    return param;
  };

  getParameter = (name: string): CfnParameter | void => this.paramMap.get(name);
}
