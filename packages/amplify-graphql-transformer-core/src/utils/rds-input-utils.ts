import { parse, print } from 'graphql';
import _ from 'lodash';

export const removeAmplifyInputDefinition = (schema: string): string => {
  if (_.isEmpty(schema)) {
    return schema;
  }

  const parsedSchema: any = parse(schema);

  parsedSchema.definitions = parsedSchema?.definitions?.filter(
    (definition: any) =>
      !(definition?.kind === 'InputObjectTypeDefinition' &&
      definition?.name &&
      definition?.name?.value === 'Amplify')
  );

  const sanitizedSchema = print(parsedSchema);
  return sanitizedSchema;
};
