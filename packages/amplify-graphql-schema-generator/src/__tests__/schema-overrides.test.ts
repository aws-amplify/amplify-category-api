import { applySchemaOverrides } from '../schema-generator';
import { print, parse } from 'graphql';
import { printer } from '@aws-amplify/amplify-prompts';

jest.mock('@aws-amplify/amplify-prompts');

describe('apply schema overrides for JSON fields', () => {
  it('should retain JSON to List type edits', () => {
    const document = parse(`
            type Post @model {
                id: ID!
                title: AWSJSON
            }

            type Blog @model {
                id: ID!
                title: AWSJSON!
            }

            type Comment @model {
                id: ID!
                description: AWSJSON!
            }

            type Author @model {
                id: ID!
                name: AWSJSON
            }
        `);
    const editedSchema = `
            type Post @model {
                id: ID!
                title: [String]
            }

            type Blog @model {
                id: ID!
                title: [String]!
            }

            type Comment @model {
                id: ID!
                description: [String!]!
            }

            type Author @model {
                id: ID!
                name: [String!]
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should retain JSON to Non-Model type edits', () => {
    const document = parse(`
            type Post @model {
                id: ID!
                title: AWSJSON
            }

            type Blog @model {
                id: ID!
                title: AWSJSON!
            }
        `);
    const editedSchema = `
            type Post @model {
                id: ID!
                title: NonModel
            }

            type Blog @model {
                id: ID!
                title: NonModel!
            }

            type NonModel {
                id: ID!
                name: String
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should allow JSON to list of Non-Model type edits', () => {
    const document = parse(`
            type Post @model {
                id: ID!
                title: AWSJSON
            }

            type Blog @model {
                id: ID!
                title: AWSJSON!
            }

            type Comment @model {
                id: ID!
                description: AWSJSON!
            }

            type Author @model {
                id: ID!
                name: AWSJSON
            }
        `);
    const editedSchema = `
            type Post @model {
                id: ID!
                title: [NonModel]
            }

            type Blog @model {
                id: ID!
                title: [NonModel]!
            }

            type Comment @model {
                id: ID!
                description: [NonModel!]!
            }

            type Author @model {
                id: ID!
                name: [NonModel!]
            }

            type NonModel {
                id: ID!
                name: String
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should prevent JSON to Scalar type edits', () => {
    const schema = `
            type Post @model {
                id: ID!
                title: AWSJSON
            }

            type Blog @model {
                id: ID!
                title: AWSJSON!
            }
        `;
    const document = parse(schema);
    const editedDocument = parse(`
            type Post @model {
                id: ID!
                title: String
            }

            type Blog @model {
                id: ID!
                title: String!
            }
        `);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), schema);
  });

  it('should add JSON field that is newly added in database', () => {
    const schema = `
            type Post @model {
                id: ID!
                title: AWSJSON
            }
        `;
    const document = parse(schema);
    const editedDocument = parse(`
            type Post @model {
                id: ID!
            }
        `);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), schema);
  });

  it('should warn when changing required JSON field to optional list', () => {
    const document = parse(`
        type Post @model {
            id: ID!
            title: AWSJSON!
        }
    `);
    const editedSchema = `
        type Post @model {
            id: ID!
            title: [String]
        }
    `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
    expect(printer.warn).toHaveBeenCalledWith(
      'The field title has been changed to an optional type while it is required in the database. This may result in SQL errors in the mutations.',
    );
  });

  it('should warn when changing required JSON field to optional Non-Model type', () => {
    const document = parse(`
        type Post @model {
            id: ID!
            title: AWSJSON!
        }
    `);
    const editedSchema = `
        type Post @model {
            id: ID!
            title: NonModel
        }

        type NonModel {
            id: ID!
        }
    `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
    expect(printer.warn).toHaveBeenCalledWith(
      'The field title has been changed to an optional type while it is required in the database. This may result in SQL errors in the mutations.',
    );
  });
});

const stringsMatchWithoutWhitespace = (actual: string, expected: string) => {
  expect(actual.replace(/\s/g, '')).toEqual(expected.replace(/\s/g, ''));
};
