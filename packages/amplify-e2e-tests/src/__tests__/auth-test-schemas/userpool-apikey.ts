import { generateDDL } from '../../rds-v2-test-utils';

export const schema = `
  type Blog 
    @model 
    @auth(rules: [
      { allow: public, operations: [get] },
      { allow: private, operations: [read, delete] },
      { allow: owner, ownerField: "authors" }
    ])
  {
    id: String! @primaryKey
    content: String
    authors: [String]
    posts: [Post] @hasMany(references: ["blogId"])
  }
  type Post 
    @model 
    @auth(rules: [
      { allow: public, operations: [list] },
      { allow: private, operations: [get, update] },
      { allow: owner }
    ])
  {
    id: String! @primaryKey
    content: String
    owner: String
    blogId: String!
    blog: Blog @belongsTo(references: ["blogId"])
  }

  type User 
    @model 
    @auth(rules: [
      { allow: groups, groups: ["Admin"] },
      { allow: public, operations: [get] },
      { allow: groups, groups: ["Dev"], operations: [read] }
      { allow: groups, groupsField: "groupField", operations: [update, delete] }
    ])
  {
    id: String! @primaryKey
    name: String
    groupField: String
    profile: Profile @hasOne(references: ["userId"])
  }
  type Profile 
    @model 
    @auth(rules: [
      { allow: groups, groups: ["Admin"] },
      { allow: public, operations: [list] },
      { allow: groups, groups: ["Dev"], operations: [get, create, update, delete] }, 
      { allow: groups, groupsField: "groupsField", operations: [read, create] }
    ])
  {
    id: String! @primaryKey
    details: String
    groupsField: [String]
    userId: String!
    user: User @belongsTo(references: ["userId"])
  }
`;

export const sqlCreateStatements = generateDDL(schema);
