import { DocumentNode, Kind, ObjectTypeDefinitionNode, EnumTypeDefinitionNode } from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
import { isScalarOrEnum } from '../helpers/is-scalar-or-enum';
import { getTypeDefinitionsOfKind } from '../helpers/get-type-definitions-of-kind';

/**
 * Validates all the @default directive validations
 *
 * @param schema graphql schema
 * @returns true if @default directive validations are satsified
 */

export const validateDefaultDirective = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];

  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const directives = objectTypeDefinition.directives?.map((directive) => directive.name.value);

    const defaultDirectiveFields = objectTypeDefinition.fields?.filter((objectField) =>
      objectField.directives?.find((directive) => directive.name.value === 'default'),
    );

    if (defaultDirectiveFields && defaultDirectiveFields?.length > 0 && !directives?.includes('model')) {
      errors.push(new InvalidDirectiveError('The @default directive may only be added to object definitions annotated with @model.'));
      return errors;
    }

    defaultDirectiveFields?.forEach((defaultDirectiveField) => {
      const defaultDirectiveArgs = defaultDirectiveField.directives?.filter(
        (defaultDirective) => defaultDirective.arguments && defaultDirective.arguments.length > 0,
      );

      const enums = getTypeDefinitionsOfKind(schema, Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];
      if (!isScalarOrEnum(defaultDirectiveField.type, enums)) {
        errors.push(new InvalidDirectiveError('The @default directive may only be added to scalar or enum field types.'));
        return errors;
      }

      defaultDirectiveArgs?.forEach((defaultDirectiveArg) => {
        if (defaultDirectiveArg.name.value === 'default') {
          if (defaultDirectiveArg.arguments && defaultDirectiveArg?.arguments?.length > 1) {
            errors.push(new InvalidDirectiveError('The @default directive only takes a value property'));
            return errors;
          }

          const fieldsArg = defaultDirectiveArg?.arguments?.find((arg) => arg.name.value === 'value');
          if (!fieldsArg) {
            /* istanbul ignore next */
            return;
          }

          if (fieldsArg.value.kind !== 'StringValue') {
            errors.push(
              new InvalidDirectiveError('String cannot represent a non string value: the @default directive has a non String value'),
            );
            return errors;
          }
        }
      });
    });
  });
  return errors;
};
