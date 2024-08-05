import { DocumentNode, Kind, ListValueNode, ObjectTypeDefinitionNode, StringValueNode } from 'graphql';
import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
import { getObjectWithName } from '../helpers/get-object-with-name';
import { resolveFieldTypeName } from '../helpers/resolve-field-type-name';

/**
 * Validates that every @belongsTo fields match related type primary key
 *
 * @param schema graphql schema
 * @returns true if @belongsTo fields match related type primary key
 */

export const validateBelongsToFieldsMatchRelatedTypePrimaryKey = (schema: DocumentNode): Error[] => {
  const errors: Error[] = [];
  const objectTypeDefinitions = schema.definitions.filter(
    (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
  ) as ObjectTypeDefinitionNode[];

  objectTypeDefinitions.forEach((objectTypeDefinition) => {
    const belongsToDirectiveFields = objectTypeDefinition.fields?.filter((objectField) =>
      objectField.directives?.find((directive) => directive.name.value === 'belongsTo'),
    );

    const fieldTypes = {} as { [fieldName: string]: string };
    objectTypeDefinition.fields?.forEach((field) => {
      const fieldName = field.name.value;
      const fieldType = resolveFieldTypeName(field.type);
      fieldTypes[fieldName] = fieldType;
    });

    belongsToDirectiveFields?.forEach((belongsToDirectiveField) => {
      const belongsTodirectiveArgs = belongsToDirectiveField.directives?.filter(
        (belongsToDirective) => belongsToDirective.arguments && belongsToDirective.arguments.length > 0,
      );
      belongsTodirectiveArgs?.forEach((belongsTodirectiveArg) => {
        const fieldsArg = belongsTodirectiveArg?.arguments?.find((arg) => arg.name.value === 'fields');
        if (!fieldsArg) {
          /* istanbul ignore next */
          return;
        }
        const fieldsVals = (fieldsArg?.value as ListValueNode)?.values;
        const typeName = resolveFieldTypeName(belongsToDirectiveField.type);
        const objectOfType = getObjectWithName(schema, typeName);

        const primaryKeyDirectiveFields = objectOfType?.fields?.filter((objectField) =>
          objectField.directives?.find((directive) => directive.name.value === 'primaryKey'),
        );

        if (primaryKeyDirectiveFields?.length === 0 && fieldsVals.length === 1) {
          const fieldVal = (fieldsVals[0] as StringValueNode).value;
          if (fieldTypes[fieldVal] !== 'ID') {
            errors.push(new InvalidDirectiveError(`${fieldVal} field is not of type ID`));
          }
        }

        const relatedModelFieldTypes = {} as { [fieldName: string]: string };
        objectOfType?.fields?.forEach((field) => {
          const fieldName = field.name.value;
          const fieldType = resolveFieldTypeName(field.type);
          relatedModelFieldTypes[fieldName] = fieldType;
        });

        primaryKeyDirectiveFields?.forEach((primaryKeyDirectiveField) => {
          const primaryKeydirectiveArgs = primaryKeyDirectiveField.directives?.filter(
            (primaryKeyDirective) => primaryKeyDirective.arguments && primaryKeyDirective.arguments.length > 0,
          );
          if (primaryKeydirectiveArgs?.length === 0 && fieldsVals.length === 1) {
            const fieldVal = (fieldsVals[0] as StringValueNode).value;
            const primaryKeyType = relatedModelFieldTypes[primaryKeyDirectiveField.name.value];
            if (fieldTypes[fieldVal] !== primaryKeyType) {
              errors.push(new InvalidDirectiveError(`${fieldVal} field is not of type ${primaryKeyType}`));
            }
          }
          primaryKeydirectiveArgs?.forEach((primaryKeydirectiveArg) => {
            const sortKeyFieldsArg = primaryKeydirectiveArg?.arguments?.find((arg) => arg.name.value === 'sortKeyFields');
            if (!sortKeyFieldsArg) {
              if (fieldsVals.length === 1) {
                const fieldVal = (fieldsVals[0] as StringValueNode).value;
                const primaryKeyType = relatedModelFieldTypes[primaryKeyDirectiveField.name.value];
                if (fieldTypes[fieldVal] !== primaryKeyType) {
                  errors.push(new InvalidDirectiveError(`${fieldVal} field is not of type ${primaryKeyType}`));
                  return errors;
                }
              }
            }

            const sortKeyFieldsVals = (sortKeyFieldsArg?.value as ListValueNode).values;

            if (sortKeyFieldsVals.length === fieldsVals.length - 1) {
              for (let i = 1; i < fieldsVals.length; i++) {
                const fieldVal = (fieldsVals[i] as StringValueNode).value;
                const sortKeyFieldVal = (sortKeyFieldsVals[i - 1] as StringValueNode).value;
                if (fieldTypes[fieldVal] !== relatedModelFieldTypes[sortKeyFieldVal]) {
                  errors.push(new InvalidDirectiveError(`${fieldVal} field is not of type ${relatedModelFieldTypes[sortKeyFieldVal]}`));
                }
              }
            }
            return errors;
          });
          return errors;
        });
      });
    });
  });
  return errors;
};
