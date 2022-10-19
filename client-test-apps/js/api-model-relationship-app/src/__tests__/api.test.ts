import path from 'path';
import { AmplifyCLI } from './utils/amplifyCLI';
import { executeAmplifyTestHarness } from './utils/testHarness';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const envName = 'devtest';
const projName = 'simplemodel';
const schemaText = `
# Standalone Model
# Non-Model Types
type Todo @model @auth(rules: [{ provider: apiKey, allow: public }]) {
  id: ID!
  content: String
  metadata: TodoMetadata
}

type TodoMetadata {
  targetCompletionDate: AWSDate
  percentChanceOfCompletion: Float
}

# HasMany Relationship
# BelongsTo Relationship
# Secondary Index
type Blog @model @auth(rules: [{ provider: apiKey, allow: public }]) {
  id: ID!
  title: String!
  author: String! @index(name: "byAuthor", queryField: "blogByAuthor")
  posts: [Post] @hasMany
}

type Post @model @auth(rules: [{ provider: apiKey, allow: public }]) {
  id: ID!
  title: String!
  content: String!
  blog: Blog @belongsTo
}

# ManyToMany Relationship
# Enum Values
type Listing @model @auth(rules: [{ provider: apiKey, allow: public }]) {
  id: ID!
  title: String!
  bedroomCount: Int
  bathroomCount: Int
  listPriceUSD: Float
  state: ListingState
  isHotProperty: Boolean
  tags: [Tag] @manyToMany(relationName: "ListingTags")
}

enum ListingState {
  OPEN
  UNDER_REVIEW
  SOLD
}

type Tag @model @auth(rules: [{ provider: apiKey, allow: public }]) {
  id: ID!
  label: String!
  listings: [Listing] @manyToMany(relationName: "ListingTags")
}

type MultiAuth @model @auth(rules: [
  { provider: apiKey, allow: public },
  { provider: userPools, allow: owner }
]) {
  id: ID!
  content: String @default(value: "Default Content")
}
`;

executeAmplifyTestHarness('simple test', PROJECT_ROOT, async (cli: AmplifyCLI) => {
  await cli.initializeProject({ name: projName, envName });
  await cli.addApiWithoutSchema();
  await cli.updateSchema(projName, schemaText);
  await cli.addAuth();
  await cli.push();
  await cli.codegen({ statementDepth: 3 });
});
