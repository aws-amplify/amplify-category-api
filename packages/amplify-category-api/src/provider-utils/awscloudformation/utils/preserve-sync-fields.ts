import * as path from 'path';
import * as fs from 'fs-extra';
import { printer } from '@aws-amplify/amplify-prompts';
import {
  parse,
  print,
  visit,
  DocumentNode,
  ObjectTypeDefinitionNode,
  FieldDefinitionNode,
  DirectiveNode,
  ArgumentNode,
  StringValueNode,
  Kind,
} from 'graphql';
import { gqlSchemaFilename } from '../aws-constants';

/** URL of the DataStore → AppSync migration guide, surfaced in warning messages. */
export const MIGRATION_GUIDE_URL = 'https://docs.amplify.aws/gen1/react/build-a-backend/more-features/datastore/migrate-from-datastore';

/** Backup file written next to `schema.graphql` on the first disable. */
export const SCHEMA_BACKUP_FILENAME = 'schema.graphql.pre-disable-backup';

/** The three DataStore metadata field names, in the order AppSync emits them. */
const SYNC_FIELD_NAMES = ['_version', '_deleted', '_lastChangedAt'] as const;

/** Scalar type for each sync field. */
const SYNC_FIELD_TYPES: Record<(typeof SYNC_FIELD_NAMES)[number], string> = {
  _version: 'Int',
  _deleted: 'Boolean',
  _lastChangedAt: 'AWSTimestamp',
};

/** A `@manyToMany` relation; `relationName` also names the synthesized join type. */
interface ManyToManyRelation {
  relationName: string;
  sourceModels: string[];
}

/** Result of {@link injectSyncFields}. */
export interface InjectSyncFieldsResult {
  updated: string;
  modifiedModels: string[];
  manyToManyRelations: ManyToManyRelation[];
}

/** Read `relationName` from a `@manyToMany(relationName: "Foo")` directive. */
const getRelationName = (directive: DirectiveNode): string | undefined => {
  const relArg = (directive.arguments ?? []).find((a: ArgumentNode) => a.name.value === 'relationName');
  if (!relArg || relArg.value.kind !== Kind.STRING) return undefined;
  return (relArg.value as StringValueNode).value;
};

/** Build a synthetic AST node for one sync field. */
const buildSyncFieldNode = (fieldName: (typeof SYNC_FIELD_NAMES)[number]): FieldDefinitionNode => ({
  kind: Kind.FIELD_DEFINITION,
  name: { kind: Kind.NAME, value: fieldName },
  type: {
    kind: Kind.NAMED_TYPE,
    name: { kind: Kind.NAME, value: SYNC_FIELD_TYPES[fieldName] },
  },
  directives: [],
});

/**
 * Inject `_version`, `_deleted`, `_lastChangedAt` into every `@model` that
 * doesn't already declare them. Idempotent. `@manyToMany` relations are
 * recorded but not touched — their synthesized join types live outside the
 * user schema.
 */
export const injectSyncFields = (schemaText: string): InjectSyncFieldsResult => {
  const ast: DocumentNode = parse(schemaText, { noLocation: true });
  const modifiedModels: string[] = [];
  const relationsByName = new Map<string, Set<string>>();

  const rewritten = visit(ast, {
    ObjectTypeDefinition: {
      leave: (node: ObjectTypeDefinitionNode): ObjectTypeDefinitionNode | undefined => {
        const isModel = (node.directives ?? []).some((d: DirectiveNode) => d.name.value === 'model');
        if (!isModel) return undefined;

        for (const field of node.fields ?? []) {
          for (const directive of field.directives ?? []) {
            if (directive.name.value !== 'manyToMany') continue;
            const relationName = getRelationName(directive);
            if (!relationName) continue;
            let sources = relationsByName.get(relationName);
            if (!sources) {
              sources = new Set<string>();
              relationsByName.set(relationName, sources);
            }
            sources.add(node.name.value);
          }
        }

        const existingFieldNames = new Set((node.fields ?? []).map((f) => f.name.value));
        const toAdd: FieldDefinitionNode[] = SYNC_FIELD_NAMES.filter((fieldName) => !existingFieldNames.has(fieldName)).map(
          buildSyncFieldNode,
        );

        if (toAdd.length === 0) return undefined;

        modifiedModels.push(node.name.value);
        return {
          ...node,
          fields: [...(node.fields ?? []), ...toAdd],
        };
      },
    },
  }) as DocumentNode;

  const manyToManyRelations: ManyToManyRelation[] = Array.from(relationsByName.entries())
    .map(([relationName, sources]) => ({
      relationName,
      sourceModels: Array.from(sources).sort(),
    }))
    .sort((a, b) => a.relationName.localeCompare(b.relationName));

  return { updated: print(rewritten), modifiedModels, manyToManyRelations };
};

/** Emit the per-model injection summary on `printer.info`. */
const printInjectionSummary = (modifiedModels: string[]): void => {
  if (modifiedModels.length === 0) {
    printer.info('All @model types already declare _version / _deleted / _lastChangedAt — no schema changes needed.');
    return;
  }
  const plural = modifiedModels.length === 1 ? '' : 's';
  printer.info(
    `Injected _version: Int, _deleted: Boolean, _lastChangedAt: AWSTimestamp into ${modifiedModels.length} @model type${plural}:`,
  );
  for (const name of modifiedModels) {
    printer.info(`  • ${name}`);
  }
};

/** Emit the full DataStore → AppSync migration checklist on `printer.warn`. */
const printMigrationChecklist = (manyToManyRelations: ManyToManyRelation[]): void => {
  printer.warn('');
  printer.warn('⚠  DataStore → AppSync migration checklist');
  printer.warn('   Disabling conflict detection is a breaking change for any code using DataStore.*.');
  printer.warn('');

  if (manyToManyRelations.length > 0) {
    printer.warn('   @manyToMany relations detected — the synthesized join types stay unchanged:');
    for (const rel of manyToManyRelations) {
      printer.warn(`     • ${rel.relationName}  (from ${rel.sourceModels.join(' ↔ ')})`);
    }
    printer.warn('   These join types are synthesized by the transformer and are NOT in your schema.graphql,');
    printer.warn('   so the sync-field injection above cannot reach them. Practical impact:');
    printer.warn('     • If your app never queries the join table directly (typical), no code change is needed.');
    printer.warn('     • Any rows in those join tables that were soft-deleted by DataStore (_deleted: true) will');
    printer.warn('       remain in DynamoDB as orphan tombstones. Run a one-time cleanup scan over the join');
    printer.warn('       tables (DynamoDB: Scan + DeleteItem where _deleted == true) if this bothers you.');
    printer.warn('');
  }

  printer.warn('   Runtime behaviour changes you must handle in your app:');
  printer.warn('     • delete<Model> mutations become HARD deletes (the DynamoDB row is removed).');
  printer.warn('       - Any UI that still treats _deleted: true as a soft-delete/tombstone will silently break.');
  printer.warn('       - If your app lists records with `.filter(_deleted !== true)`, you can just remove the filter.');
  printer.warn('       - If your app uses soft-delete as a "trash bin" UX, migrate to a custom mutation or add');
  printer.warn('         an explicit `deletedAt: AWSDateTime` field and hide deleted rows in the client.');
  printer.warn('     • _version is now a regular user field, NOT auto-incremented by AppSync resolvers.');
  printer.warn('       - Values you write in mutation inputs round-trip through DynamoDB, but have no concurrency');
  printer.warn('         semantics anymore — stale _version no longer triggers conflict handlers.');
  printer.warn('     • sync<Model> queries and observeQuery subscriptions no longer exist.');
  printer.warn('       Migrate to list<Model> + onCreate<Model>/onUpdate<Model>/onDelete<Model> subscriptions.');
  printer.warn('');
  printer.warn(`   Migration guide: ${MIGRATION_GUIDE_URL}`);
  printer.warn('');
};

/**
 * Rewrite `<resourceDir>/schema.graphql` to keep the three sync fields,
 * write a one-time backup, and emit the migration checklist. Soft-fails on
 * I/O or parse errors so the walkthrough doesn't crash mid-disable.
 */
export const preserveSyncFieldsOnDisable = async (resourceDir: string): Promise<void> => {
  const schemaPath = path.join(resourceDir, gqlSchemaFilename);
  if (!(await fs.pathExists(schemaPath))) {
    printer.warn(
      `preserveSyncFields: no schema.graphql at ${schemaPath} — skipping metadata field injection. ` +
        'If you use the split schema/ directory layout you will need to add _version/_deleted/_lastChangedAt manually.',
    );
    return;
  }

  let original: string;
  try {
    original = (await fs.readFile(schemaPath)).toString();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    printer.warn(`preserveSyncFields: failed to read ${schemaPath}: ${msg}. Skipping injection.`);
    return;
  }

  let result: InjectSyncFieldsResult;
  try {
    result = injectSyncFields(original);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    printer.warn(
      `preserveSyncFields: schema.graphql failed to parse (${msg}). ` +
        'Skipping injection — please add _version/_deleted/_lastChangedAt manually.',
    );
    return;
  }

  if (result.modifiedModels.length > 0) {
    const backupPath = path.join(resourceDir, SCHEMA_BACKUP_FILENAME);
    if (!(await fs.pathExists(backupPath))) {
      await fs.writeFile(backupPath, original);
    }
    await fs.writeFile(schemaPath, result.updated);
  }

  printInjectionSummary(result.modifiedModels);
  printMigrationChecklist(result.manyToManyRelations);
};
