import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
  StringValueNode,
} from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
import { resolveFieldTypeName } from '../helpers/resolve-field-type-name';

/**
 * Validates that every @manyToMany relation has correct types
 *
 * @param schema graphql schema
 * @returns true if @manyToMany relation has correct type
 */

/**
 *
 * @param schema
 */
export const validateCorrectTypeInManyToManyRelation = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];

  const relationObjectNames = {} as { [relationName: string]: string[] };
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) => objectField.directives?.find(
      (directive) => directive.name.value === 'manyToMany',
    ));

    const objectName = objectTypeDefinition.name.value;

    directiveFields?.forEach((directiveField) => {
      const directiveArgs = directiveField.directives?.filter((directive) => directive.arguments && directive.arguments.length > 0);
      directiveArgs?.forEach((directiveArg) => {
        const fieldArg = directiveArg?.arguments?.find((arg) => arg.name.value === 'relationName');
        if (!fieldArg) {
          /* istanbul ignore next */
          return;
        }

        const relationName = (fieldArg?.value as StringValueNode)?.value;

        if (relationObjectNames[relationName]) {
          relationObjectNames[relationName].push(objectName);
        } else {
          const objectNames = [];
          objectNames.push(objectName);
          relationObjectNames[relationName] = objectNames;
        }
      });
    });
  });

  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) => objectField.directives?.find(
      (directive) => directive.name.value === 'manyToMany',
    ));
    const objectName = objectTypeDefinition.name.value;
    directiveFields?.forEach((directiveField) => {
      const typeName = resolveFieldTypeName(directiveField.type);
      const directiveArgs = directiveField.directives?.filter((directive) => directive.arguments && directive.arguments.length > 0);
      directiveArgs?.forEach((directiveArg) => {
        const fieldArg = directiveArg?.arguments?.find((arg) => arg.name.value === 'relationName');
        if (!fieldArg) {
          /* istanbul ignore next */
          return;
        }

        const relationName = (fieldArg?.value as StringValueNode)?.value;

        const objectNames = relationObjectNames[relationName];

        if (typeName === objectName || !objectNames.includes(typeName)) {
          let expectedName;
          objectNames.forEach((name) => {
            if (name !== objectName) {
              expectedName = name;
            }
          });
          errors.push(new InvalidDirectiveError(
            `@manyToMany relation ${relationName} expects ${expectedName} but got ${typeName}`,
          ));
        }
      });
    });
  });
  return errors;
};
