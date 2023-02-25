import {
  DocumentNode,
  Kind,
  EnumTypeDefinitionNode,
} from 'graphql';
import { ValidationError } from '../exceptions/validation-error';

/**
     * Enum is defined once
     *
     * @param schema graphql schema
     * @returns true if a enum is defined once
     */
export const validateEnumIsDefinedOnce = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const enumTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.ENUM_TYPE_DEFINITION,
  ) as EnumTypeDefinitionNode[];

  enumTypeDefinitions.forEach((enumTypeDefinition) => {
    const enumName = enumTypeDefinition.name.value;
    const enumValues = enumTypeDefinition.values;
    if (!enumValues) {
      /* istanbul ignore next */
      return;
    }
    console.log('schema definition --- ', enumValues);

    const uniqueEnums: string[] = [];
    enumValues?.forEach((enumVal) => {
      const val = enumVal.name.value;
      if (!uniqueEnums.includes(val)) {
        uniqueEnums.push(val);
      } else {
        errors.push(new ValidationError(
          `Schema validation failed. Enum value ${enumName}.${val} can only be defined once.`,
        ));
      }
    });
  });
  return errors;
};
