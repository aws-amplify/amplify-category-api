import {
    DocumentNode,
    Kind,
    ListTypeNode,
    ListValueNode,
    ObjectTypeDefinitionNode,
    StringValueNode,
  } from 'graphql';
  import { InvalidDirectiveError } from '../exceptions/invalid-directive-error';
  import { getObjectWithName } from '../helpers/get-object-with-name';
  import { resolveFieldTypeName } from '../helpers/resolve-field-type-name';
  
  /**
   * Validates that any of the fields passed in are in the parent model
   *
   * @param schema graphql schema
   * @returns true
   */
  export const validateFieldInParentModel = (schema: DocumentNode): Error[] => {
    const errors: Error[] = [];
    const objectTypeDefinitions = schema.definitions.filter(
      (defintion) => defintion.kind === Kind.OBJECT_TYPE_DEFINITION,
    ) as ObjectTypeDefinitionNode[];
    objectTypeDefinitions.forEach((objectTypeDefinition) => {
      const directiveFields = objectTypeDefinition.fields?.filter((objectField) => objectField.directives?.find(
        (directive) => directive.name.value,
      ));

      directiveFields?.forEach((directiveField) => {
        const typeName = resolveFieldTypeName(directiveField.type);
        if (!typeName) {
          return;
        }
        const objectOfType = getObjectWithName(schema, typeName);
        const fields = objectOfType?.fields;
        if(!fields) {
          return;
        }
        const fieldVals: String[] = [];
        for (let i = 0; i < fields?.length; i++) {
          const val = fields[i].name.value;
          fieldVals.push(val);
        };

        const directiveArgs = directiveField.directives?.find((directive) => directive.arguments);
        const fieldArg = directiveArgs?.arguments?.find(arg => arg.name.value === 'fields');
        if(!fieldArg) {
          return;
        }
        
        const fieldArgVals = (fieldArg.value as ListValueNode).values;
        for (let i = 0; i < fieldArgVals.length; i++) {
          const val = (fieldArgVals[i] as StringValueNode).value;
          if(!fieldVals.includes(val)) {
            errors.push(new InvalidDirectiveError(
              `${val} is not a field in ${objectOfType.name.value}`,
            ));
          }
        }
      });
    });
    return errors;
  };
  