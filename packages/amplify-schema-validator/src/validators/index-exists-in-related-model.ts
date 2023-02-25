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
     * Validates that index exists in the related model
     *
     * @param schema graphql schema
     * @returns true if index exists in the related model
     */
export const validateIndexExistsInRelatedModel = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const hasManyDirectiveFields = objectTypeDefinition.fields?.filter((objectField) => objectField.directives?.find(
      (directive) => directive.name.value === 'hasMany',
    ));

    hasManyDirectiveFields?.forEach((hasManyDirectiveField) => {
      const hasManyDirectiveArgs = hasManyDirectiveField.directives?.filter((hasManyDirective) => hasManyDirective.arguments && hasManyDirective.arguments.length > 0);
      hasManyDirectiveArgs?.forEach((hasManyDirectiveArg) => {
        const indexNameFieldArg = hasManyDirectiveArg?.arguments?.find((arg) => arg.name.value === 'indexName');
        if (!indexNameFieldArg) {
          /* istanbul ignore next */
          return;
        }

        const indexName = (indexNameFieldArg.value as StringValueNode).value;

        const typeName = resolveFieldTypeName(hasManyDirectiveField.type);
        const objectOfType = getObjectWithName(schema, typeName);
        const indexDirectiveFields = objectOfType?.fields?.filter((objectField) => objectField.directives?.find(
          (directive) => directive.name.value === 'index',
        ));

        const indexNameInRelatedModel: string[] = [];
        indexDirectiveFields?.forEach((indexDirectiveField) => {
          const indexDirectiveArgs = indexDirectiveField.directives?.filter((indexDirective) => indexDirective.arguments && indexDirective.arguments.length > 0);
          indexDirectiveArgs?.forEach((indexDirectiveArg) => {
            const nameFieldArg = indexDirectiveArg?.arguments?.find((arg) => arg.name.value === 'name');
            if (!nameFieldArg) {
              /* istanbul ignore next */
              return;
            }

            indexNameInRelatedModel.push((nameFieldArg.value as StringValueNode).value);
          });
        });

        if (!indexNameInRelatedModel.includes(indexName)) {
          errors.push(new InvalidDirectiveError(
            `Index ${indexName} does not exist for model ${objectOfType?.name.value}`,
          ));
        }
      });
    });
  });
  return errors;
};
