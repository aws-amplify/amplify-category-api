import { applySchemaOverrides } from '../schema-generator';
import { print, parse, FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';
import { printer } from '@aws-amplify/amplify-prompts';
import { findMatchingField } from '../schema-generator';

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

describe('apply schema overrides for models with refersTo', () => {
  it('should be the same if no edits are made', () => {
    const document = parse(`
            type Post @refersTo(name: "posts") @model {
                id: ID!
                name: String
            }
        `);
    const editedSchema = `
            type Post @refersTo(name: "posts") @model {
                id: ID!
                name: String
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should allow type name overrides', () => {
    const document = parse(`
            type Post @refersTo(name: "posts") @model {
                id: ID!
                name: String
            }
        `);
    const editedSchema = `
            type MyPost @refersTo(name: "posts") @model {
                id: ID!
                name: String
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should allow removing inferred model name mappings', () => {
    const document = parse(`
            type Post @refersTo(name: "posts") @model {
                id: ID!
                title: String
            }
        `);
    const editedSchema = `
            type posts @model {
                id: ID!
                title: String
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should allow adding refersTo to models', () => {
    const document = parse(`
            type Post @model {
                id: ID!
                title: String
            }
        `);
    const editedSchema = `
            type MyPost @refersTo(name: "Post") @model {
                id: ID!
                title: String
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should retain relational and model namings when used together', () => {
    const documents = [
      parse(`
            type Profile @model {
                id: String! @primaryKey
                details: String
                userId: String
            }
        
            type User @refersTo(name: "Users") @model {
                id: String! @primaryKey
                name: String
            }
        `),

      parse(`
            type Profile @model {
                id: String! @primaryKey
                details: String
                userId: String
            }
        
            type User @refersTo(name: "Users") @model {
                id: String! @primaryKey
                name: String
            }
        `),
    ];
    const editedSchemas = [
      `type Portfolio @refersTo(name: "Profile") @model {
            id: String! @primaryKey
            details: String
            userId: String
            user: User @belongsTo(references: ["userId"])
        }
    
        type User @refersTo(name: "Users") @model {
            id: String! @primaryKey
            name: String
            portfolio: Portfolio @hasOne(references: ["userId"])
        }`,

      `type Profile @model {
            id: String! @primaryKey
            details: String
            userId: String
            user: User @belongsTo(references: ["userId"])
        }
    
        type User @refersTo(name: "Users") @model {
            id: String! @primaryKey
            name: String
            profile: Profile @hasOne(references: ["userId"])
        }`,
    ];
    documents.forEach((document, index) => {
      const editedDocument = parse(editedSchemas[index]);
      const updatedDocument = applySchemaOverrides(document, editedDocument);
      stringsMatchWithoutWhitespace(print(updatedDocument), editedSchemas[index]);
    });
  });

  it('should retain relational directives', () => {
    const document = parse(`
        type Profile @model {
            id: String! @primaryKey
            details: String
            userId: String
        }
      
        type User @model {
            id: String! @primaryKey
            name: String
        }
    `);
    const editedSchema = `
        type Profile @model {
            id: String! @primaryKey
            details: String
            userId: String
            user: User @belongsTo(references: ["userId"])
        }
    
        type User @model {
            id: String! @primaryKey
            name: String
            profile: Profile @hasOne(references: ["userId"])
        }
    `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should not allow duplicate model name mappings in edited schema', () => {
    let generatedSchema = `
        type Post @model {
            id: String! @primaryKey
            content: String
        }
    `;
    const editedSchema = `
        type Post @model {
            id: String! @primaryKey
            content: String
        }
        type MyPost @refersTo(name: "Post") @model {
            id: String! @primaryKey
            content: String
        }
    `;
    const editedDocument = parse(editedSchema);
    expect(() => applySchemaOverrides(parse(generatedSchema), editedDocument)).toThrowErrorMatchingInlineSnapshot(
      `"Types Post, MyPost are mapped to the same table Post. Remove the duplicate mapping."`,
    );

    generatedSchema = `
        type MyPost @model @refersTo(name: "Post") {
            id: String! @primaryKey
            content: String
        }
    `;
    expect(() => applySchemaOverrides(parse(generatedSchema), editedDocument)).toThrowErrorMatchingInlineSnapshot(
      `"Types Post, MyPost are mapped to the same table Post. Remove the duplicate mapping."`,
    );
  });

  it('should allow overrides on models used as output to custom queries', () => {
    const document = parse(`
            type ZipCode @refersTo(name: "zip_code") @model {
                id: ID!
                stateName: String @refersTo(name: "state_name")
            }
        `);
    const editedSchema = `
            type Zip @refersTo(name: "zip_code") @model {
                id: ID!
                state: String @refersTo(name: "state_name")
            }
            type Query {
                getZipCodeByState(state: String!): [Zip] @sql(statement: "SELECT * FROM zip_code WHERE state_name = :state")
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should not allow duplicate types mapping to same table as output to custom queries', () => {
    const document = parse(`
            type ZipCode @refersTo(name: "zip_code") @model {
                id: ID!
                stateName: String @refersTo(name: "state_name")
            }
            type Query {
                getZipCodeByState(state: String!): [ZipCode] @sql(statement: "SELECT * FROM zip_code WHERE state_name = :state")
            }
        `);
    const editedSchema = `
            type Zip @refersTo(name: "zip_code") @model {
                id: ID!
                state: String @refersTo(name: "state_name")
            }
            type zip_code {
                id: ID!
                state_name: String
            }
            type Query {
                getZipCodeByState(state: String!): [Zip] @sql(statement: "SELECT * FROM zip_code WHERE state_name = :state")
            }
        `;
    const editedDocument = parse(editedSchema);
    expect(() => applySchemaOverrides(document, editedDocument)).toThrowErrorMatchingInlineSnapshot(
      `"Types Zip, zip_code are mapped to the same table zip_code. Remove the duplicate mapping."`,
    );
  });
});

describe('apply schema overrides for model fields with refersTo', () => {
  it('should be the same if no edits are made', () => {
    const schema = `
        type Post @refersTo(name: "posts") @model {
            id: ID!
            nameField: String @refersTo(name: "name_field")
        }
        `;
    const document = parse(schema);
    const updatedDocument = applySchemaOverrides(document, document);
    stringsMatchWithoutWhitespace(print(updatedDocument), schema);
  });

  it('should allow field name overrides', () => {
    const document = parse(`
              type Post @refersTo(name: "posts") @model {
                  id: ID!
                  nameField: String @refersTo(name: "name_field")
              }
          `);
    const editedSchema = `
              type MyPost @refersTo(name: "posts") @model {
                  id: ID!
                  name: String @refersTo(name: "name_field")
              }
          `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should allow removing inferred field name mappings', () => {
    const document = parse(`
              type Post @model {
                  id: ID! @refersTo(name: "my_id")
                  nameField: String @refersTo(name: "name_field")
              }
          `);
    const editedSchema = `
              type Post @model {
                  id: ID! @refersTo(name: "my_id")
                  name_field: String
              }
          `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should allow adding refersTo to fields', () => {
    const document = parse(`
              type Post @model {
                  id: ID!
                  nameField: String
              }
          `);
    const editedSchema = `
              type MyPost @refersTo(name: "Post") @model {
                  id: ID!
                  name: String @refersTo(name: "nameField")
              }
          `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should retain renaming of fields referenced with relational directive', () => {
    const document = parse(`
              type Profile @model {
                  id: String! @primaryKey
                  details: String
                  userId: String @index(sortKeyFields: ["id"])
              }
          
              type User @refersTo(name: "Users") @model {
                  id: String! @primaryKey
                  name: String @refersTo(name: "nameField")
              }
        `);
    const editedSchema = `type Portfolio @refersTo(name: "Profile") @model {
            myId: String! @refersTo(name: "id") @primaryKey
            details: String
            myUserId: String @refersTo(name: "userId") @index(sortKeyFields: ["id"])
            user: User @belongsTo(references: ["myUserId"])
        }

        type User @refersTo(name: "Users") @model {
            id: String! @primaryKey
            myName: String @refersTo(name: "nameField")
            portfolio: Portfolio @hasOne(references: ["myUserId"])
        }
      `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should retain removing the renaming of fields referenced with relational directive', () => {
    const document = parse(`
              type Profile @model {
                  myId: String! @refersTo(name: "id") @primaryKey
                  details: String
                  myUserId: String @refersTo(name: "userId") @index(sortKeyFields: ["id"])
              }
          
              type User @refersTo(name: "Users") @model {
                  id: String! @primaryKey
                  myName: String @refersTo(name: "name")
              }
        `);
    const editedSchema = `type Profile @model {
              id: String! @primaryKey
              details: String
              userId: String @index(sortKeyFields: ["id"])
              user: User @belongsTo(references: ["userId"])
          }
      
          type User @refersTo(name: "Users") @model {
              id: String! @primaryKey
              name: String
              profile: Profile @hasOne(references: ["userId"])
        }`;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should not allow renaming fields relational directives', () => {
    const document = parse(`
          type Profile @model {
              id: String! @primaryKey
              details: String
              userId: String
          }
        
          type User @model {
              id: String! @primaryKey
              name: String
          }
      `);
    const editedSchema = `
          type Profile @model {
              id: String! @primaryKey
              details: String
              userId: String
              user: User @belongsTo(references: ["userId"]) @refersTo(name: "Users")
          }
      
          type User @model {
              id: String! @primaryKey
              name: String
              profile: Profile @hasOne(references: ["userId"]) @refersTo(name: "Portfolio")
          }
      `;
    const editedDocument = parse(editedSchema);
    expect(() => applySchemaOverrides(document, editedDocument)).toThrowErrorMatchingInlineSnapshot(
      `"Field \\"user\\" cannot be renamed because it is a relational field."`,
    );
  });

  it('should not allow duplicate field name mappings in edited schema', () => {
    const generatedSchema = `
        type Post @model {
            id: String! @primaryKey
            content: String
        }
    `;
    const document = parse(generatedSchema);
    let editedSchema = `
        type Post @model {
            id: String! @primaryKey
            content: String
            newContent: String @refersTo(name: "content")
        }
    `;
    expect(() => applySchemaOverrides(document, parse(editedSchema))).toThrowErrorMatchingInlineSnapshot(
      `"Fields content, newContent are mapped to the same column content. Remove the duplicate mapping."`,
    );

    editedSchema = `
        type Post @model {
            id: String! @primaryKey
            newContent: String @refersTo(name: "content")
            brandNewContent: String @refersTo(name: "content")
        }
    `;
    expect(() => applySchemaOverrides(parse(generatedSchema), parse(editedSchema))).toThrowErrorMatchingInlineSnapshot(
      `"Fields newContent, brandNewContent are mapped to the same column content. Remove the duplicate mapping."`,
    );
  });
});

describe('finds matching field', () => {
  const testModel = `
        type Post @model {
            id: ID!
            title: String
        }
    `;

  it('should return undefined if no matching field', () => {
    const document = parse(testModel);
    const columnName = 'nonExistentField';
    const tableName = 'Post';
    const field = findMatchingField(columnName, tableName, document);
    expect(field).toBeUndefined();
  });

  it('should return matching field', () => {
    const document = parse(testModel);
    const columnName = 'title';
    const tableName = 'Post';
    const field = findMatchingField(columnName, tableName, document);
    expect(field).toBeDefined();
    expect(field?.name?.value).toEqual('title');
  });
});

describe('model auth rules overrides', () => {
  it('should retain added auth rules for models with no name mapping', () => {
    const document = parse(`
            type Post @model
            {
                id: ID!
                name: String
            }
        `);
    const editedSchema = `
            type Post @model
            @auth(rules: [
                { allow: groups, groups: ["Admin"] },
                { allow: public, operations: [get] },
                { allow: groups, groups: ["Dev"], operations: [read] },
                { allow: groups, groupsField: "groupField", operations: [update, delete] }
            ])
            {
                id: ID!
                name: String
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should retain added auth rules for models with name mapping', () => {
    const document = parse(`
            type Post @refersTo(name: "posts") @model
            {
                id: ID!
                name: String
            }
        `);
    const editedSchema = `
            type Post @refersTo(name: "posts") @model
            @auth(rules: [
                { allow: groups, groups: ["Admin"] },
                { allow: public, operations: [get] },
                { allow: groups, groups: ["Dev"], operations: [read] },
                { allow: groups, groupsField: "groupField", operations: [update, delete] }
            ])
            {
                id: ID!
                name: String
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should retain added auth rules for models with name mapping and relational fields', () => {
    const document = parse(`
            type Profile @refersTo(name: "profiles") @model {
                id: String! @primaryKey
                details: String
                userId: String
            }
        
            type User @model @refersTo(name: "users") {
                id: String! @primaryKey
                name: String
            }
        `);
    const editedSchema = `
            type profiles @model
            @auth(rules: [
                { allow: groups, groups: ["Admin"] },
                { allow: public, operations: [get] }
            ])
            {
                id: String! @primaryKey
                details: String
                userId: String
                user: User @belongsTo(references: ["userId"])
            }
        
            type MyUser
            @refersTo(name: "users")
            @model
            @auth(rules: [
                { allow: groups, groups: ["Admin"] },
                { allow: public, operations: [get] }
            ])
            {
                id: String! @primaryKey
                name: String
                profile: Profile @hasOne(references: ["userId"])
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });
});

describe('schema overrides for Enum types', () => {
  it('should retain added custom enum types', () => {
    const document = parse(`
            type Post @model {
                id: ID!
                title: String
            }
        `);
    const editedSchema = `
            type Post @model {
                id: ID!
                title: String
            }
            enum Status {
                ACTIVE
                INACTIVE
            }
        `;
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), editedSchema);
  });

  it('should not retain edits to non-custom enum types', () => {
    const schema = `
            enum Status {
                ACTIVE
                INACTIVE
            }
        `;
    const editedSchema = `
            enum Status {
                ACTIVE
                INACTIVE
                DELETED
            }
        `;
    const document = parse(schema);
    const editedDocument = parse(editedSchema);
    const updatedDocument = applySchemaOverrides(document, editedDocument);
    stringsMatchWithoutWhitespace(print(updatedDocument), schema);
  });
});

const stringsMatchWithoutWhitespace = (actual: string, expected: string) => {
  expect(actual.replace(/\s/g, '')).toEqual(expected.replace(/\s/g, ''));
};
