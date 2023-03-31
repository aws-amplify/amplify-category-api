import {
  DocumentNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
import { getObjectWithName } from '../helpers/get-object-with-name';
import { resolveFieldTypeName } from '../helpers/resolve-field-type-name';

/**
 * Validates that models do not refer each other with @hasMany/@hasOne relation when dataStore is enabled
 *
 * @param schema graphql schema
 * @returns true if models do not refer each other with @hasMany/@hasOne relation when dataStore is enabled
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
export const validateBelongsToIsUsedWhenDatastoreInUse = (
  schema: DocumentNode, _amplifyFeatureFlags?: string, dataStoreEnabled?: boolean,
): Error[] => {
  if (!dataStoreEnabled) {
    return [];
  }

  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];
  for (let i = 0; i < objectTypeDefinitions.length; i++) {
    const objectTypeDefinition = objectTypeDefinitions[i];
    const directiveFields = objectTypeDefinition.fields?.filter((objectField) => objectField.directives?.find(
      (directive) => directive.name.value === 'hasOne' || directive.name.value === 'hasMany',
    ));

    const objectName = objectTypeDefinition.name.value;
    directiveFields?.forEach((directiveField) => {
      const typeName = resolveFieldTypeName(directiveField.type);
      const relatedObject = getObjectWithName(schema, typeName);

      if (relatedObject?.name.value === objectName) {
        /* istanbul ignore next */
        return;
      }

      const relatedObjectdirectiveFields = relatedObject?.fields?.filter((objectField) => objectField.directives?.find(
        (directive) => directive.name.value === 'hasOne' || directive.name.value === 'hasMany',
      ));

      if (!relatedObjectdirectiveFields) {
        /* istanbul ignore next */
        return;
      }

      for (let j = 0; j < relatedObjectdirectiveFields.length; j++) {
        const relatedObjectdirectiveField = relatedObjectdirectiveFields[j];
        const typeName1 = resolveFieldTypeName(relatedObjectdirectiveField.type);
        const relatedObject1 = getObjectWithName(schema, typeName1);
        if (relatedObject1?.name.value === objectName) {
          errors.push(new InvalidDirectiveError(
            `${relatedObject?.name.value} and ${objectName} cannot refer to each other via @hasOne or @hasMany when DataStore is in use. Use @belongsTo instead. See https://docs.amplify.aws/cli/graphql/data-modeling/#belongs-to-relationship`,
          ));
          break;
        }
      }
    });
    if (errors.length > 0) {
      break;
    }
  }
  return errors;
};
