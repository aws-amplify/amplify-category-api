import { StackManagerProvider, AccountConfig } from '@aws-amplify/graphql-transformer-interfaces';
import {
  Stack,
  App,
  CfnParameter,
  CfnParameterProps,
  StackProps,
} from 'aws-cdk-lib';
import { TransformerNestedStack, TransformerRootStack, TransformerStackSythesizer } from '../cdk-compat';

export type ResourceToStackMap = Record<string, string>;
const stacksRequireAccountInfoForSynth = ['RdsApiStacks_XXXXXXXXXXXXXX'];

/**
 * StackManager
 */
export class StackManager implements StackManagerProvider {
  private stacks: Map<string, Stack> = new Map();
  private childStackSynthesizers: Map<string, TransformerStackSythesizer> = new Map();
  private stackSynthesizer = new TransformerStackSythesizer();
  public readonly rootStack: TransformerRootStack;
  private resourceToStackMap: Map<string, string>;
  private paramMap: Map<string, CfnParameter> = new Map();
  constructor(app: App, resourceMapping: ResourceToStackMap, private accountConfig?: AccountConfig) {
    this.rootStack = new TransformerRootStack(app, 'transformer-root-stack', {
      synthesizer: this.stackSynthesizer,
      // env: { account: this.accountConfig?.accountId, region: this.accountConfig?.region },
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
    const stackProps: StackProps = {
      synthesizer,
      ...stacksRequireAccountInfoForSynth.includes(stackName) && {
        env: {
          account: this.accountConfig?.accountId,
          region: this.accountConfig?.region,
        },
      },
    };
    const newStack = new TransformerNestedStack(this.rootStack, stackName, stackProps);
    this.childStackSynthesizers.set(stackName, synthesizer);
    this.stacks.set(stackName, newStack);
    return newStack;
  };

  hasStack = (stackName: string): boolean => this.stacks.has(stackName);

  getStackFor = (resourceId: string, defaultStackName?: string): Stack => {
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

  getCloudFormationTemplates = () => {
    let stacks = this.stackSynthesizer.collectStacks();
    this.childStackSynthesizers.forEach((synthesizer, stackName) => {
      stacks = new Map([...stacks.entries(), ...synthesizer.collectStacks()]);
    });
    return stacks;
  }

  getMappingTemplates = () => this.stackSynthesizer.collectMappingTemplates();

  addParameter = (name: string, props: CfnParameterProps): CfnParameter => {
    const param = new CfnParameter(this.rootStack, name, props);
    this.paramMap.set(name, param);
    return param;
  };

  getParameter = (name: string): CfnParameter | void => this.paramMap.get(name);
}
