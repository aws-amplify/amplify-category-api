import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
  StringValueNode,
} from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
import { getObjectWithName } from '../helpers/get-object-with-name';
import { resolveFieldTypeName } from '../helpers/resolve-field-type-name';

/**
     * Validates that key exists in the related model
     *
     * @param schema graphql schema
     * @returns true if key exists in the related model
     */
export const validateKeyExistsInRelatedModel = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const connectionDirectiveFields = objectTypeDefinition.fields?.filter((objectField) => objectField.directives?.find(
      (directive) => directive.name.value === 'connection',
    ));

    connectionDirectiveFields?.forEach((connectionDirectiveField) => {
      const connectionDirectiveArgs = connectionDirectiveField.directives?.filter((connectionDirectiveField) => connectionDirectiveField.arguments && connectionDirectiveField.arguments.length > 0);
      connectionDirectiveArgs?.forEach((connectionDirectiveArg) => {
        const keyNameFieldArg = connectionDirectiveArg?.arguments?.find((arg) => arg.name.value === 'keyName');
        if (!keyNameFieldArg) {
          /* istanbul ignore next */
          return;
        }

        const keyName = (keyNameFieldArg.value as StringValueNode).value;
        const typeName = resolveFieldTypeName(connectionDirectiveField.type);
        const objectOfType = getObjectWithName(schema, typeName);
        const keyDirective = objectOfType?.directives?.find((directive) => directive.name.value === 'key');
        if (!keyDirective) {
          errors.push(new InvalidDirectiveError(
            `Key ${keyName} does not exist for model ${objectOfType?.name.value}`,
          ));
        }

        keyDirective?.arguments?.forEach((keyDirectiveArg) => {
          if (keyDirectiveArg.name.value === 'name' && (keyDirectiveArg.value as StringValueNode).value !== keyName) {
            errors.push(new InvalidDirectiveError(
              `Key ${keyName} does not exist for model ${objectOfType?.name.value}`,
            ));
          }
        });
      });
    });
  });
  return errors;
};
