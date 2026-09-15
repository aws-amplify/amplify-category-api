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
    if (options?.deepMergeArguments && needsDeepMerge(defaultValue, argValues)) {
      return _.merge(
        _.cloneDeepWith(defaultValue, (value) => {
          if (value instanceof Location) {
            // Skip cloning for 'Locations'
            // Some transformers are using AST nodes as arguments.
            // These AST nodes contain 'loc: Location' property which contains information
            // about where tokens were found in the schema during parsing.
            // This is a deeply nested structure for large schemas and cloning it may
            // hit recursive call limits.
            // Location is typed as read-only and doesn't change in post processing after parsing.
            // Therefore, is safe to keep original values.
            return value;
          }
          // Returning undefined let's Lodash know to use it's algorithm to clone.
          return undefined;
        }),
        argValues,
      );
    }
    return Object.assign(defaultValue, argValues);
  };
}

export const generateGetArgumentsInput = ({ shouldDeepMergeDirectiveConfigDefaults }: TransformParameters): GetArgumentsOptions => ({
  deepMergeArguments: shouldDeepMergeDirectiveConfigDefaults,
});

/**
 * Checks for cases where we don't need to do deep cloning and merging of arguments.
 * These include cases when the user provided arguments are empty or when there are no common keys between the default and user provided arguments.
 * @param defaultValue the default properties set for the directive
 * @param argValues the user provided arguments for the directive
 * @returns if deep cloning and merging of arguments is needed
 */
export const needsDeepMerge = <T>(defaultValue: Required<T>, argValues: { [x: string]: any }): boolean => {
  if (_.isEmpty(argValues)) {
    return false;
  }
  if (typeof defaultValue === 'object') {
    return Object.keys(argValues)?.some((key) => Object.keys(defaultValue)?.includes(key));
  }
  return true;
};
