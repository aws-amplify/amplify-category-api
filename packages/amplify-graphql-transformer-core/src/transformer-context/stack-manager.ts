import { StackManagerProvider, Template } from '@aws-amplify/graphql-transformer-interfaces';
import { Stack, App, CfnParameter, CfnParameterProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TransformerNestedStack, TransformerRootStack, TransformerStackSythesizer } from '../cdk-compat';

export type ResourceToStackMap = Record<string, string>;

/**
 * StackManager
 */
export class StackManager implements StackManagerProvider {
  private stacks: Map<string, Stack> = new Map();

  private childStackSynthesizers: Map<string, TransformerStackSythesizer> = new Map();

  private stackSynthesizer = new TransformerStackSythesizer();

  public readonly scope: Construct;

  private resourceToStackMap: Map<string, string>;

  private paramMap: Map<string, CfnParameter> = new Map();

  constructor(app: App, resourceMapping: ResourceToStackMap) {
    this.scope = new TransformerRootStack(app, 'transformer-root-stack', {
      synthesizer: this.stackSynthesizer,
    });
    // add Env Parameter to ensure to adhere to contract
    this.resourceToStackMap = new Map(Object.entries(resourceMapping));
    this.addParameter('env', {
      default: 'NONE',
      type: 'String',
    });
  }

  createStack = (stackName: string): Stack => {
    const synthesizer = new TransformerStackSythesizer();
    const newStack = new TransformerNestedStack(this.scope, stackName, {
      synthesizer,
    });
    this.childStackSynthesizers.set(stackName, synthesizer);
    this.stacks.set(stackName, newStack);
    return newStack;
  };

  hasStack = (stackName: string): boolean => this.stacks.has(stackName);

  getScopeFor = (resourceId: string, defaultStackName?: string): Construct => {
    const stackName = this.resourceToStackMap.has(resourceId) ? this.resourceToStackMap.get(resourceId) : defaultStackName;
    if (!stackName) {
      return this.scope;
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
    let stacks = this.stackSynthesizer.collectStacks();
    this.childStackSynthesizers.forEach((synthesizer) => {
      stacks = new Map([...stacks.entries(), ...synthesizer.collectStacks()]);
    });
    return stacks;
  };

  getMappingTemplates = (): Map<string, string> => this.stackSynthesizer.collectMappingTemplates();

  addParameter = (name: string, props: CfnParameterProps): CfnParameter => {
    const param = new CfnParameter(this.scope, name, props);
    this.paramMap.set(name, param);
    return param;
  };

  getParameter = (name: string): CfnParameter | void => this.paramMap.get(name);
}
