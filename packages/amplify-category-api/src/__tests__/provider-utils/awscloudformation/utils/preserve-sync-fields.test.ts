/** Unit tests for `utils/preserve-sync-fields`. */
/* eslint-disable no-underscore-dangle */
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { printer } from '@aws-amplify/amplify-prompts';
import {
  injectSyncFields,
  MIGRATION_GUIDE_URL,
  preserveSyncFieldsOnDisable,
  SCHEMA_BACKUP_FILENAME,
} from '../../../../provider-utils/awscloudformation/utils/preserve-sync-fields';

jest.mock('@aws-amplify/amplify-prompts');

const mockedPrinter = printer as jest.Mocked<typeof printer>;

beforeEach(() => {
  jest.clearAllMocks();
});

/** True iff all three sync fields are present with correct scalar types. */
/* eslint-disable @typescript-eslint/no-var-requires, global-require */
const hasAllSyncFields = (schema: string, typeName: string): boolean => {
  const { parse, visit } = require('graphql');
  const ast = parse(schema, { noLocation: true });
  const found = { _version: false, _deleted: false, _lastChangedAt: false };
  visit(ast, {
    ObjectTypeDefinition: (node: {
      name: { value: string };
      fields?: ReadonlyArray<{
        name: { value: string };
        type: { kind: string; name?: { value: string } };
      }>;
    }) => {
      if (node.name.value !== typeName) return undefined;
      for (const field of node.fields ?? []) {
        const scalar = field.type.kind === 'NamedType' && field.type.name ? field.type.name.value : '';
        if (field.name.value === '_version' && scalar === 'Int') found._version = true;
        if (field.name.value === '_deleted' && scalar === 'Boolean') found._deleted = true;
        if (field.name.value === '_lastChangedAt' && scalar === 'AWSTimestamp') found._lastChangedAt = true;
      }
      return undefined;
    },
  });
  return found._version && found._deleted && found._lastChangedAt;
};
/* eslint-enable @typescript-eslint/no-var-requires, global-require */

describe('injectSyncFields', () => {
  it('adds the three sync fields to a @model type that lacks them', () => {
    const schema = `
      type Todo @model {
        id: ID!
        title: String!
      }
    `;
    const result = injectSyncFields(schema);
    expect(result.modifiedModels).toEqual(['Todo']);
    expect(result.manyToManyRelations).toEqual([]);
    expect(hasAllSyncFields(result.updated, 'Todo')).toBe(true);
  });

  it('is idempotent — running twice yields the same output as once', () => {
    const schema = `
      type Todo @model {
        id: ID!
        title: String!
      }
    `;
    const once = injectSyncFields(schema);
    const twice = injectSyncFields(once.updated);
    expect(twice.updated).toBe(once.updated);
    expect(twice.modifiedModels).toEqual([]);
  });

  it('does not modify a @model that already declares all three fields', () => {
    const schema = `
      type Todo @model {
        id: ID!
        title: String!
        _version: Int
        _deleted: Boolean
        _lastChangedAt: AWSTimestamp
      }
    `;
    const result = injectSyncFields(schema);
    expect(result.modifiedModels).toEqual([]);
  });

  it.each([
    ['_version only', 'type T @model { id: ID! _version: Int }'],
    ['_deleted only', 'type T @model { id: ID! _deleted: Boolean }'],
    ['_lastChangedAt only', 'type T @model { id: ID! _lastChangedAt: AWSTimestamp }'],
    ['_version + _deleted', 'type T @model { id: ID! _version: Int _deleted: Boolean }'],
    ['_version + _lastChangedAt', 'type T @model { id: ID! _version: Int _lastChangedAt: AWSTimestamp }'],
    ['_deleted + _lastChangedAt', 'type T @model { id: ID! _deleted: Boolean _lastChangedAt: AWSTimestamp }'],
  ])('fills in missing fields when some are already declared: %s', (_, schema) => {
    const result = injectSyncFields(schema);
    expect(result.modifiedModels).toEqual(['T']);
    expect(hasAllSyncFields(result.updated, 'T')).toBe(true);
    for (const field of ['_version', '_deleted', '_lastChangedAt']) {
      const count = (result.updated.match(new RegExp(`${field}:`, 'g')) ?? []).length;
      expect(count).toBe(1);
    }
  });

  it('ignores object types that are not annotated with @model', () => {
    const schema = `
      type Todo @model {
        id: ID!
      }
      type NotAModel {
        id: ID!
      }
    `;
    const result = injectSyncFields(schema);
    expect(result.modifiedModels).toEqual(['Todo']);
    expect(result.updated).not.toMatch(/type\s+NotAModel\s*\{[^}]*_version/s);
  });

  it('ignores enum and scalar definitions', () => {
    const schema = `
      enum Status { ACTIVE INACTIVE }
      scalar MyScalar
      type Todo @model { id: ID! }
    `;
    const result = injectSyncFields(schema);
    expect(result.modifiedModels).toEqual(['Todo']);
    expect(result.manyToManyRelations).toEqual([]);
  });

  it('tracks @manyToMany relations by relationName and enumerates source models', () => {
    const schema = `
      type Card @model {
        id: ID!
        title: String!
        labels: [Label] @manyToMany(relationName: "CardLabel")
      }
      type Label @model {
        id: ID!
        name: String!
        cards: [Card] @manyToMany(relationName: "CardLabel")
      }
    `;
    const result = injectSyncFields(schema);
    expect(result.modifiedModels.sort()).toEqual(['Card', 'Label']);
    expect(result.manyToManyRelations).toHaveLength(1);
    expect(result.manyToManyRelations[0].relationName).toBe('CardLabel');
    expect(result.manyToManyRelations[0].sourceModels).toEqual(['Card', 'Label']);
    expect(hasAllSyncFields(result.updated, 'Card')).toBe(true);
    expect(hasAllSyncFields(result.updated, 'Label')).toBe(true);
    expect(result.updated).not.toMatch(/type\s+CardLabel\b/);
  });

  it('tracks multiple distinct @manyToMany relations', () => {
    const schema = `
      type User @model { id: ID! }
      type Post @model {
        id: ID!
        tags: [Tag] @manyToMany(relationName: "PostTag")
        collaborators: [User] @manyToMany(relationName: "PostCollaborator")
      }
      type Tag @model {
        id: ID!
        posts: [Post] @manyToMany(relationName: "PostTag")
      }
    `;
    const result = injectSyncFields(schema);
    expect(result.manyToManyRelations.map((r) => r.relationName)).toEqual(['PostCollaborator', 'PostTag']);
    expect(result.manyToManyRelations.find((r) => r.relationName === 'PostTag')?.sourceModels).toEqual(['Post', 'Tag']);
    expect(result.manyToManyRelations.find((r) => r.relationName === 'PostCollaborator')?.sourceModels).toEqual(['Post']);
  });

  it('preserves @auth, @hasMany, @belongsTo, and @index directives on other fields', () => {
    const schema = `
      type Board @model
        @auth(rules: [{ allow: owner, ownerField: "owner", identityClaim: "email" }]) {
        id: ID!
        name: String!
        owner: String
        workspaceID: ID! @index(name: "byWorkspace")
        columns: [Column] @hasMany(indexName: "byBoard", fields: ["id"])
      }
      type Column @model {
        id: ID!
        name: String!
        boardID: ID! @index(name: "byBoard")
        board: Board @belongsTo(fields: ["boardID"])
      }
    `;
    const result = injectSyncFields(schema);
    expect(result.modifiedModels.sort()).toEqual(['Board', 'Column']);
    expect(result.updated).toMatch(/@auth\(rules:/);
    expect(result.updated).toMatch(/@hasMany\(indexName: "byBoard"/);
    expect(result.updated).toMatch(/@belongsTo\(fields:/);
    expect(result.updated).toMatch(/@index\(name: "byBoard"\)/);
    expect(hasAllSyncFields(result.updated, 'Board')).toBe(true);
    expect(hasAllSyncFields(result.updated, 'Column')).toBe(true);
  });

  it('uses correct scalar types: Int, Boolean, AWSTimestamp', () => {
    const schema = 'type Todo @model { id: ID! }';
    const result = injectSyncFields(schema);
    expect(result.updated).toMatch(/_version:\s*Int\b/);
    expect(result.updated).toMatch(/_deleted:\s*Boolean\b/);
    expect(result.updated).toMatch(/_lastChangedAt:\s*AWSTimestamp\b/);
  });

  it('returns empty lists for a schema with no @model types', () => {
    const schema = `
      type NotAModel {
        id: ID!
      }
      enum Status {
        ACTIVE
        INACTIVE
      }
    `;
    const result = injectSyncFields(schema);
    expect(result.modifiedModels).toEqual([]);
    expect(result.manyToManyRelations).toEqual([]);
  });

  it('throws on syntactically invalid SDL (caller expected to catch)', () => {
    expect(() => injectSyncFields('type Broken @model { id: ID!')).toThrow();
  });
});

describe('preserveSyncFieldsOnDisable', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'preserve-sync-fields-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('rewrites schema.graphql and writes a one-time backup', async () => {
    const schemaPath = path.join(tmpDir, 'schema.graphql');
    const original = 'type Todo @model {\n  id: ID!\n  title: String!\n}\n';
    await fs.writeFile(schemaPath, original);

    await preserveSyncFieldsOnDisable(tmpDir);

    const backup = await fs.readFile(path.join(tmpDir, SCHEMA_BACKUP_FILENAME), 'utf8');
    expect(backup).toBe(original);

    const updated = await fs.readFile(schemaPath, 'utf8');
    expect(hasAllSyncFields(updated, 'Todo')).toBe(true);
  });

  it('does not overwrite an existing backup on a second run', async () => {
    const schemaPath = path.join(tmpDir, 'schema.graphql');
    const backupPath = path.join(tmpDir, SCHEMA_BACKUP_FILENAME);
    await fs.writeFile(schemaPath, 'type Todo @model {\n  id: ID!\n}\n');
    await fs.writeFile(backupPath, 'PREEXISTING BACKUP CONTENTS');

    await preserveSyncFieldsOnDisable(tmpDir);

    const backup = await fs.readFile(backupPath, 'utf8');
    expect(backup).toBe('PREEXISTING BACKUP CONTENTS');
  });

  it('soft-fails when schema.graphql is missing (no throw)', async () => {
    await expect(preserveSyncFieldsOnDisable(tmpDir)).resolves.toBeUndefined();
    expect(await fs.pathExists(path.join(tmpDir, SCHEMA_BACKUP_FILENAME))).toBe(false);
  });

  it('prints the full migration checklist to printer.warn and an injection summary to printer.info', async () => {
    const schemaPath = path.join(tmpDir, 'schema.graphql');
    await fs.writeFile(schemaPath, 'type Todo @model {\n  id: ID!\n}\n');

    await preserveSyncFieldsOnDisable(tmpDir);

    const warnMessages = mockedPrinter.warn.mock.calls.map((args) => String(args[0])).join('\n');
    const infoMessages = mockedPrinter.info.mock.calls.map((args) => String(args[0])).join('\n');
    expect(warnMessages).toContain('DataStore → AppSync migration checklist');
    expect(warnMessages).toContain('delete<Model> mutations become HARD deletes');
    expect(warnMessages).toContain('sync<Model> queries and observeQuery subscriptions no longer exist');
    expect(warnMessages).toContain(MIGRATION_GUIDE_URL);
    expect(infoMessages).toContain('Injected _version');
    expect(infoMessages).toContain('• Todo');
  });

  it('prints the "no changes needed" info when every @model already has the fields', async () => {
    const schemaPath = path.join(tmpDir, 'schema.graphql');
    await fs.writeFile(
      schemaPath,
      'type Todo @model {\n  id: ID!\n  _version: Int\n  _deleted: Boolean\n  _lastChangedAt: AWSTimestamp\n}\n',
    );

    await preserveSyncFieldsOnDisable(tmpDir);

    const infoMessages = mockedPrinter.info.mock.calls.map((args) => String(args[0])).join('\n');
    expect(infoMessages).toContain('already declare _version');
    expect(await fs.pathExists(path.join(tmpDir, SCHEMA_BACKUP_FILENAME))).toBe(false);
  });
});
