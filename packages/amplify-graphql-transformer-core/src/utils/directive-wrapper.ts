import { ArgumentNode, DirectiveNode, NameNode, valueFromASTUntyped, ValueNode, Location } from 'graphql';
import _ from 'lodash';
import type { TransformParameters } from '@aws-amplify/graphql-transformer-interfaces';

export type GetArgumentsOptions = {
  deepMergeArguments?: boolean;
};

export class ArgumentWrapper {
  public readonly name: NameNode;

  public readonly value: ValueNode;

  constructor(argument: ArgumentNode) {
    this.name = argument.name;
    this.value = argument.value;
  }

  serialize = (): ArgumentNode => {
    return {
      kind: 'Argument',
      name: this.name,
      value: this.value,
    };
  };
}

export class DirectiveWrapper {
  private arguments: ArgumentWrapper[] = [];

  private name: NameNode;

  private location?: Location;

  constructor(node: DirectiveNode) {
    this.name = node.name;
    this.arguments = (node.arguments ?? []).map((arg) => new ArgumentWrapper(arg));
    this.location = this.location;
  }

  public serialize = (): DirectiveNode => {
    return {
      kind: 'Directive',
      name: this.name,
      arguments: this.arguments.map((arg) => arg.serialize()),
    };
  };

  public getArguments = <T>(defaultValue: Required<T>, options?: GetArgumentsOptions): Required<T> => {
    const argValues = this.arguments.reduce(
      (acc: Record<string, any>, arg: ArgumentWrapper) => ({
        ...acc,
        [arg.name.value]: valueFromASTUntyped(arg.value),
      }),
      {},
    );
    if (options?.deepMergeArguments && !_.isEmpty(argValues)) {
      const clonedDefaultArgValues = _.cloneDeep(defaultValue);
      return _.merge(clonedDefaultArgValues, argValues);
    }
    return Object.assign(defaultValue, argValues);
  };
}

export const generateGetArgumentsInput = ({ shouldDeepMergeDirectiveConfigDefaults }: TransformParameters): GetArgumentsOptions => ({
  deepMergeArguments: shouldDeepMergeDirectiveConfigDefaults,
});
