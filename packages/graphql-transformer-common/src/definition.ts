import {
  ObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  FieldDefinitionNode,
  TypeNode,
  SchemaDefinitionNode,
  OperationTypeNode,
  OperationTypeDefinitionNode,
  ObjectTypeExtensionNode,
  NamedTypeNode,
  Kind,
  NonNullTypeNode,
  ListTypeNode,
  valueFromASTUntyped,
  ArgumentNode,
  DirectiveNode,
  EnumTypeDefinitionNode,
  ValueNode,
  InputObjectTypeDefinitionNode,
  UnionTypeDefinitionNode,
  DocumentNode,
} from 'graphql';

type ScalarMap = {
  [k: string]: 'String' | 'Int' | 'Float' | 'Boolean' | 'ID';
};
export const STANDARD_SCALARS: ScalarMap = {
  String: 'String',
  Int: 'Int',
  Float: 'Float',
  Boolean: 'Boolean',
  ID: 'ID',
};

const OTHER_SCALARS: ScalarMap = {
  BigInt: 'Int',
  Double: 'Float',
};

export const APPSYNC_DEFINED_SCALARS: ScalarMap = {
  AWSDate: 'String',
  AWSTime: 'String',
  AWSDateTime: 'String',
  AWSTimestamp: 'Int',
  AWSEmail: 'String',
  AWSJSON: 'String',
  AWSURL: 'String',
  AWSPhone: 'String',
  AWSIPAddress: 'String',
};

export const DEFAULT_SCALARS: ScalarMap = {
  ...STANDARD_SCALARS,
  ...OTHER_SCALARS,
  ...APPSYNC_DEFINED_SCALARS,
};

export const NUMERIC_SCALARS: { [k: string]: boolean } = {
  BigInt: true,
  Int: true,
  Float: true,
  Double: true,
  AWSTimestamp: true,
};

export const MAP_SCALARS: { [k: string]: boolean } = {
  AWSJSON: true,
};

/**
 *
 * @param scalar
 */
export function attributeTypeFromScalar(scalar: TypeNode): 'S' | 'N' {
  const baseType = getBaseType(scalar);
  const baseScalar = DEFAULT_SCALARS[baseType];
  if (!baseScalar) {
    throw new Error(`Expected scalar and got ${baseType}`);
  }
  switch (baseScalar) {
    case 'String':
    case 'ID':
      return 'S';
    case 'Int':
    case 'Float':
      return 'N';
    case 'Boolean':
      throw new Error('Boolean values cannot be used as sort keys.');
    default:
      throw new Error(`There is no valid DynamoDB attribute type for scalar ${baseType}`);
  }
}

/**
 *
 * @param type
 */
export function isScalar(type: TypeNode) {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return isScalar(type.type);
  } if (type.kind === Kind.LIST_TYPE) {
    return isScalar(type.type);
  }
  return Boolean(DEFAULT_SCALARS[type.name.value]);
}

/**
 *
 * @param type
 * @param enums
 */
export function isScalarOrEnum(type: TypeNode, enums: EnumTypeDefinitionNode[]) {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return isScalarOrEnum(type.type, enums);
  } if (type.kind === Kind.LIST_TYPE) {
    return isScalarOrEnum(type.type, enums);
  }
  for (const e of enums) {
    if (e.name.value === type.name.value) {
      return true;
    }
  }
  return Boolean(DEFAULT_SCALARS[type.name.value]);
}

/**
 *
 * @param type
 * @param document
 */
export function isEnum(type: TypeNode, document: DocumentNode) {
  const baseType = getBaseType(type);
  return document.definitions.find((def) => def.kind === Kind.ENUM_TYPE_DEFINITION && def.name.value === baseType);
}

/**
 *
 * @param type
 */
export function getBaseType(type: TypeNode): string {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return getBaseType(type.type);
  } if (type.kind === Kind.LIST_TYPE) {
    return getBaseType(type.type);
  }
  return type.name.value;
}

/**
 *
 * @param type
 */
export function isListType(type: TypeNode): boolean {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return isListType(type.type);
  } if (type.kind === Kind.LIST_TYPE) {
    return true;
  }
  return false;
}

/**
 *
 * @param type
 */
export function isNonNullType(type: TypeNode): boolean {
  return type.kind === Kind.NON_NULL_TYPE;
}

/**
 *
 * @param directive
 * @param arg
 * @param dflt
 */
export function getDirectiveArgument(directive: DirectiveNode, arg: string, dflt?: any) {
  const argument = directive.arguments.find((a) => a.name.value === arg);
  return argument ? valueFromASTUntyped(argument.value) : dflt;
}

/**
 *
 * @param type
 */
export function unwrapNonNull(type: TypeNode) {
  if (type.kind === 'NonNullType') {
    return unwrapNonNull(type.type);
  }
  return type;
}

/**
 *
 * @param type
 */
export function wrapNonNull(type: TypeNode) {
  if (type.kind !== 'NonNullType') {
    return makeNonNullType(type);
  }
  return type;
}

/**
 *
 * @param operation
 * @param type
 */
export function makeOperationType(operation: OperationTypeNode, type: string): OperationTypeDefinitionNode {
  return {
    kind: 'OperationTypeDefinition',
    operation,
    type: {
      kind: 'NamedType',
      name: {
        kind: 'Name',
        value: type,
      },
    },
  };
}

/**
 *
 * @param operationTypes
 */
export function makeSchema(operationTypes: OperationTypeDefinitionNode[]): SchemaDefinitionNode {
  return {
    kind: Kind.SCHEMA_DEFINITION,
    operationTypes,
    directives: [],
  };
}

/**
 *
 * @param name
 */
export function blankObject(name: string): ObjectTypeDefinitionNode {
  return {
    kind: 'ObjectTypeDefinition',
    name: {
      kind: 'Name',
      value: name,
    },
    fields: [],
    directives: [],
    interfaces: [],
  };
}

/**
 *
 * @param name
 */
export function blankObjectExtension(name: string): ObjectTypeExtensionNode {
  return {
    kind: Kind.OBJECT_TYPE_EXTENSION,
    name: {
      kind: 'Name',
      value: name,
    },
    fields: [],
    directives: [],
    interfaces: [],
  };
}

/**
 *
 * @param object
 * @param fields
 */
export function extensionWithFields(object: ObjectTypeExtensionNode, fields: FieldDefinitionNode[]): ObjectTypeExtensionNode {
  return {
    ...object,
    fields: [...object.fields, ...fields],
  };
}

/**
 *
 * @param object
 * @param directives
 */
export function extensionWithDirectives(object: ObjectTypeExtensionNode, directives: DirectiveNode[]): ObjectTypeExtensionNode {
  if (directives && directives.length > 0) {
    const newDirectives = [];

    for (const directive of directives) {
      if (!object.directives.find((d) => d.name.value === directive.name.value)) {
        newDirectives.push(directive);
      }
    }

    if (newDirectives.length > 0) {
      return {
        ...object,
        directives: [...object.directives, ...newDirectives],
      };
    }
  }

  return object;
}

/**
 *
 * @param field
 * @param directives
 */
export function extendFieldWithDirectives(field: FieldDefinitionNode, directives: DirectiveNode[]): FieldDefinitionNode {
  if (directives && directives.length > 0) {
    const newDirectives = [];

    for (const directive of directives) {
      if (!field.directives.find((d) => d.name.value === directive.name.value)) {
        newDirectives.push(directive);
      }
    }

    if (newDirectives.length > 0) {
      return {
        ...field,
        directives: [...field.directives, ...newDirectives],
      };
    }
  }

  return field;
}

/**
 *
 * @param name
 * @param types
 */
export function defineUnionType(name: string, types: NamedTypeNode[] = []): UnionTypeDefinitionNode {
  return {
    kind: Kind.UNION_TYPE_DEFINITION,
    name: {
      kind: 'Name',
      value: name,
    },
    types,
  };
}

/**
 *
 * @param name
 * @param inputs
 */
export function makeInputObjectDefinition(name: string, inputs: InputValueDefinitionNode[]): InputObjectTypeDefinitionNode {
  return {
    kind: 'InputObjectTypeDefinition',
    name: {
      kind: 'Name',
      value: name,
    },
    fields: inputs,
    directives: [],
  };
}

/**
 *
 * @param name
 * @param inputs
 */
export function makeObjectDefinition(name: string, inputs: FieldDefinitionNode[]): ObjectTypeDefinitionNode {
  return {
    kind: Kind.OBJECT_TYPE_DEFINITION,
    name: {
      kind: 'Name',
      value: name,
    },
    fields: inputs,
    directives: [],
  };
}

/**
 *
 * @param name
 * @param args
 * @param type
 * @param directives
 */
export function makeField(
  name: string,
  args: InputValueDefinitionNode[],
  type: TypeNode,
  directives: DirectiveNode[] = [],
): FieldDefinitionNode {
  return {
    kind: Kind.FIELD_DEFINITION,
    name: {
      kind: 'Name',
      value: name,
    },
    arguments: args,
    type,
    directives,
  };
}

/**
 *
 * @param name
 * @param args
 */
export function makeDirective(name: string, args: ArgumentNode[]): DirectiveNode {
  return {
    kind: Kind.DIRECTIVE,
    name: {
      kind: Kind.NAME,
      value: name,
    },
    arguments: args,
  };
}

/**
 *
 * @param name
 * @param value
 */
export function makeArgument(name: string, value: ValueNode): ArgumentNode {
  return {
    kind: Kind.ARGUMENT,
    name: {
      kind: 'Name',
      value: name,
    },
    value,
  };
}

/**
 *
 * @param value
 */
export function makeValueNode(value: any): ValueNode {
  if (typeof value === 'string') {
    return { kind: Kind.STRING, value };
  } if (Number.isInteger(value)) {
    return { kind: Kind.INT, value };
  } if (typeof value === 'number') {
    return { kind: Kind.FLOAT, value: String(value) };
  } if (typeof value === 'boolean') {
    return { kind: Kind.BOOLEAN, value };
  } if (value === null) {
    return { kind: Kind.NULL };
  } if (Array.isArray(value)) {
    return {
      kind: Kind.LIST,
      values: value.map((v) => makeValueNode(v)),
    };
  } if (typeof value === 'object') {
    return {
      kind: Kind.OBJECT,
      fields: Object.keys(value).map((key: string) => {
        const keyValNode = makeValueNode(value[key]);
        return {
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: key },
          value: keyValNode,
        };
      }),
    };
  }
}

/**
 *
 * @param name
 * @param type
 */
export function makeInputValueDefinition(name: string, type: TypeNode): InputValueDefinitionNode {
  return {
    kind: Kind.INPUT_VALUE_DEFINITION,
    name: {
      kind: 'Name',
      value: name,
    },
    type,
    directives: [],
  };
}

/**
 *
 * @param name
 */
export function makeNamedType(name: string): NamedTypeNode {
  return {
    kind: 'NamedType',
    name: {
      kind: 'Name',
      value: name,
    },
  };
}

/**
 *
 * @param type
 */
export function makeNonNullType(type: NamedTypeNode | ListTypeNode): NonNullTypeNode {
  return {
    kind: Kind.NON_NULL_TYPE,
    type,
  };
}

/**
 *
 * @param type
 */
export function makeListType(type: TypeNode): ListTypeNode {
  return {
    kind: 'ListType',
    type,
  };
}
