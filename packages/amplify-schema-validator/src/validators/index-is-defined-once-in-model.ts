import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
  StringValueNode,
} from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';

/**
   * Validates that an index with same name exists only once in a model
   *
   * @param schema graphql schema
   * @returns true if an index with same name exists only once in a model
   */
export const validateIndexIsDefinedOnce = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const objectName = objectTypeDefinition.name.value;
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) => objectField.directives?.find(
      (directive) => directive.name.value === 'index',
    ));

    if (!directiveFields) {
      /* istanbul ignore next */
      return;
    }

    const uniqueIndexNames: string[] = [];
    directiveFields.forEach((directiveField) => {
      const directiveArgs = directiveField.directives?.filter((directive) => directive.arguments && directive.arguments.length > 0);
      directiveArgs?.forEach((directiveArg) => {
        const fieldArg = directiveArg?.arguments?.find((arg) => arg.name.value === 'name');
        if (!fieldArg) {
          /* istanbul ignore next */
          return;
        }
        const indexName = (fieldArg.value as StringValueNode).value;
        if (uniqueIndexNames.includes(indexName)) {
          errors.push(new InvalidDirectiveError(
            `You may only supply one @index with the name ${indexName} on type ${objectName}`,
          ));
        } else {
          uniqueIndexNames.push(indexName);
        }
      });
    });
  });
  return errors;
};
