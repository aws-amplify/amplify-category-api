import type {
  AssetProps,
  AssetProvider,
  NestedStackProvider,
  S3Asset,
  SynthParameters,
  TransformParameterProvider,
} from '@aws-amplify/graphql-transformer-interfaces';
import { App, CfnParameter, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AmplifyApiGraphQlResourceStackTemplate } from './amplify-api-resource-stack-types';
import { AmplifyS3Asset } from './amplify-s3-asset';
import { DeploymentResources, Template } from './deployment-resources';
import { TransformerNestedStack } from './nested-stack';
import { TransformerRootStack } from './root-stack';
import { TransformerStackSythesizer } from './stack-synthesizer';

export type OverrideConfig = {
  overrideFlag: boolean;
  applyOverride: (scope: Construct) => AmplifyApiGraphQlResourceStackTemplate;
};

/**
 * Stack Manager plugin which supports the Amplify CLI transformer behavior today. Manages Transformer stacks, nested stacks,
 * and synthesizers, then provides mechanisms for synthesis.
 */
export class TransformManager {
  private readonly app: App = new App();
  public readonly rootStack: TransformerRootStack;
  private readonly stackSynthesizer = new TransformerStackSythesizer();
  private readonly childStackSynthesizers: Map<string, TransformerStackSythesizer> = new Map();
  private synthParameters: SynthParameters;
  private paramMap: Map<string, CfnParameter>;

  constructor(
    private readonly overrideConfig: OverrideConfig | undefined,
    hasIamAuth: boolean,
    hasUserPoolAuth: boolean,
    adminRoles: string[],
    identityPoolId: string,
  ) {
    this.rootStack = new TransformerRootStack(this.app, 'transformer-root-stack', {
      synthesizer: this.stackSynthesizer,
    });

    this.generateParameters(hasIamAuth, hasUserPoolAuth, adminRoles, identityPoolId);
  }

  getTransformScope(): Construct {
    return this.rootStack;
  }

  /**
   * Retrieve the nestedStackProvider for a Transformer Managed Stack
   */
  getNestedStackProvider(): NestedStackProvider {
    return {
      provide: (scope: Construct, name: string): Stack => {
        const synthesizer = new TransformerStackSythesizer();
        const newStack = new TransformerNestedStack(scope, name, {
          synthesizer,
        });
        this.childStackSynthesizers.set(name, synthesizer);
        return newStack;
      },
    };
  }

  getAssetProvider(): AssetProvider {
    return {
      provide: (scope: Construct, id: string, props: AssetProps): S3Asset => new AmplifyS3Asset(scope, id, props),
    };
  }

  private generateParameters(hasIamAuth: boolean, hasUserPoolAuth: boolean, adminRoles: string[], identityPoolId: string): void {
    this.paramMap = new Map();
    const envParameter = new CfnParameter(this.rootStack, 'env', {
      default: 'NONE',
      type: 'String',
    });
    this.paramMap.set('env', envParameter);
    const apiNameParameter = new CfnParameter(this.rootStack, 'AppSyncApiName', {
      default: 'AppSyncSimpleTransform',
      type: 'String',
    });
    this.paramMap.set('AppSyncApiName', apiNameParameter);
    this.synthParameters = {
      amplifyEnvironmentName: envParameter.valueAsString,
      apiName: apiNameParameter.valueAsString,
      adminRoles,
      identityPoolId,
    };
    if (hasIamAuth) {
      const authenticatedUserRoleNameParameter = new CfnParameter(this.rootStack, 'authRoleName', { type: 'String' });
      this.synthParameters.authenticatedUserRoleName = authenticatedUserRoleNameParameter.valueAsString;
      this.paramMap.set('authRoleName', authenticatedUserRoleNameParameter);
      const unauthenticatedUserRoleNameParameter = new CfnParameter(this.rootStack, 'unauthRoleName', { type: 'String' });
      this.synthParameters.unauthenticatedUserRoleName = unauthenticatedUserRoleNameParameter.valueAsString;
      this.paramMap.set('unauthRoleName', unauthenticatedUserRoleNameParameter);
    }
    if (hasUserPoolAuth) {
      const userPoolIdParameter = new CfnParameter(this.rootStack, 'AuthCognitoUserPoolId', { type: 'String' });
      this.synthParameters.userPoolId = userPoolIdParameter.valueAsString;
      this.paramMap.set('AuthCognitoUserPoolId', userPoolIdParameter);
    }
  }

  getParameterProvider(): TransformParameterProvider {
    return {
      provide: (name: string): CfnParameter | void => this.paramMap.get(name),
    };
  }

  getSynthParameters(): SynthParameters {
    return this.synthParameters;
  }

  generateDeploymentResources(): Omit<DeploymentResources, 'userOverriddenSlots'> {
    if (this.overrideConfig?.overrideFlag) {
      this.overrideConfig.applyOverride(this.rootStack);
    }

    this.app.synth({ force: true, skipValidation: true });

    const templates = this.getCloudFormationTemplates();
    const rootStackTemplate = templates.get('transformer-root-stack');
    const childStacks: Record<string, Template> = {};
    for (const [templateName, template] of templates.entries()) {
      if (templateName !== 'transformer-root-stack') {
        childStacks[templateName] = template;
      }
    }

    const fileAssets = this.getMappingTemplates();
    const pipelineFunctions: Record<string, string> = {};
    const resolvers: Record<string, string> = {};
    const functions: Record<string, string> = {};
    for (const [templateName, template] of fileAssets) {
      if (templateName.startsWith('pipelineFunctions/')) {
        pipelineFunctions[templateName.replace('pipelineFunctions/', '')] = template;
      } else if (templateName.startsWith('resolvers/')) {
        resolvers[templateName.replace('resolvers/', '')] = template;
      } else if (templateName.startsWith('functions/')) {
        functions[templateName.replace('functions/', '')] = template;
      }
    }
    const schema = fileAssets.get('schema.graphql') || '';

    return {
      functions,
      pipelineFunctions,
      resolvers,
      schema,
      stacks: childStacks,
      rootStack: rootStackTemplate!,
      stackMapping: {},
    };
  }

  private getCloudFormationTemplates = (): Map<string, Template> => {
    let stacks = this.stackSynthesizer.collectStacks();
    this.childStackSynthesizers.forEach((synthesizer) => {
      stacks = new Map([...stacks.entries(), ...synthesizer.collectStacks()]);
    });
    return stacks;
  };

  private getMappingTemplates = (): Map<string, string> => this.stackSynthesizer.collectMappingTemplates();
}
