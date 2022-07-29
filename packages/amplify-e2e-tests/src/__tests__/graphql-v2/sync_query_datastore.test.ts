import {
    initJSProjectWithProfile,
    deleteProject,
    amplifyPush,
} from 'amplify-category-api-e2e-core';
import { addApiWithBlankSchemaAndConflictDetection, updateApiSchema, getProjectMeta } from 'amplify-category-api-e2e-core';
import { createNewProjectDir, deleteProjectDir } from 'amplify-category-api-e2e-core';
import gql from 'graphql-tag';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
(global as any).fetch = require('node-fetch');

const projectName = 'syncquerytest';
describe('Sync query V2 resolver tests', () => {
    let projRoot: string;
    let appSyncClient = undefined;
  
    beforeEach(async () => {
      projRoot = await createNewProjectDir(projectName);
      await initJSProjectWithProfile(projRoot, {
        name: projectName,
      });
      // await addAuthWithDefault(projRoot, {});
    });
  
    afterEach(async () => {
      await deleteProject(projRoot);
      deleteProjectDir(projRoot);
    });
  
    it('Able to sync latest updates with and without lastSync', async () => {
        const v2Schema = 'schema_with_index.graphql';
        await addApiWithBlankSchemaAndConflictDetection(projRoot, { transformerVersion: 2 });
        await updateApiSchema(projRoot, projectName, v2Schema);
        await amplifyPush(projRoot);
    
        appSyncClient = getAppSyncClientFromProj(projRoot);
        
        const createResult = await createSong('song1', 'rock');

        expect(createResult.data).not.toBeNull();
        expect(createResult.errors).toBeUndefined();
        expect(createResult.data.createSong).not.toBeNull();
        expect(createResult.data.createSong.id).toBeDefined();
        expect(createResult.data.createSong.name).toEqual('song1');
        expect(createResult.data.createSong.genre).toEqual('rock');
        expect(createResult.data.createSong._version).toEqual(1);
        expect(createResult.data.createSong._lastChangedAt).toBeDefined();
        expect(createResult.data.createSong._deleted).toBeNull();

        const songId = createResult.data.createSong.id;
        const songCreatedAt = createResult.data.createSong._lastChangedAt;

        // able to sync songs without lastSync specified. This will do a query on base table.
        const syncResult = await syncSongs();
        expect(syncResult.data).not.toBeNull();
        expect(syncResult.errors).toBeUndefined();
        expect(syncResult.data.syncSongs).not.toBeNull();
        expect(syncResult.data.syncSongs.items?.length).toEqual(1);
        const songAfterFirstSync = syncResult.data.syncSongs.items[0];
        expect(songAfterFirstSync.id).toEqual(songId);
        expect(songAfterFirstSync.name).toEqual('song1');
        expect(songAfterFirstSync.genre).toEqual('rock');
        expect(songAfterFirstSync._version).toEqual(1);
        expect(songAfterFirstSync._lastChangedAt).toEqual(songCreatedAt);
        // sync is started with the sync query post record creation
        expect(syncResult.data.syncSongs.startedAt).toBeGreaterThan(songCreatedAt);

        const syncStartedAt = syncResult.data.syncSongs.startedAt;

        // now update the song record post sync
        const updateResult = await updateSong(songId, 'song2', 'country', 1);
        expect(updateResult.data).not.toBeNull();
        expect(updateResult.errors).toBeUndefined();
        expect(updateResult.data.updateSong).not.toBeNull();
        expect(updateResult.data.updateSong.id).toEqual(songId);
        expect(updateResult.data.updateSong.name).toEqual('song2');
        expect(updateResult.data.updateSong.genre).toEqual('country');
        // the record version should be updated
        expect(updateResult.data.updateSong._version).toEqual(2);
        expect(updateResult.data.updateSong._lastChangedAt).toBeGreaterThan(syncStartedAt);
        expect(updateResult.data.updateSong._deleted).toBeNull();

        // performing a sync with lastSync set, should fetch the updated song
        const syncResultAfterUpdate = await syncSongs(syncStartedAt);
        expect(syncResultAfterUpdate.data).not.toBeNull();
        expect(syncResultAfterUpdate.errors).toBeUndefined();
        expect(syncResultAfterUpdate.data.syncSongs).not.toBeNull();
        expect(syncResultAfterUpdate.data.syncSongs.items?.length).toEqual(1);
        const songAfterSecondSync = syncResultAfterUpdate.data.syncSongs.items[0];
        expect(songAfterSecondSync.id).toEqual(songId);
        expect(songAfterSecondSync.name).toEqual('song2');
        expect(songAfterSecondSync.genre).toEqual('country');
        expect(songAfterSecondSync._version).toEqual(2);
        expect(songAfterSecondSync._lastChangedAt).toEqual(updateResult.data.updateSong._lastChangedAt);
        // sync is re-started with the sync query
        expect(syncResultAfterUpdate.data.syncSongs.startedAt).toBeGreaterThan(syncStartedAt);
    });
  
    const getAppSyncClientFromProj = (projRoot: string) => {
      const meta = getProjectMeta(projRoot);
      const region = meta['providers']['awscloudformation']['Region'] as string;
      const { output } = meta.api[projectName];
      const url = output.GraphQLAPIEndpointOutput as string;
      const apiKey = output.GraphQLAPIKeyOutput as string;
  
      return new AWSAppSyncClient({
        url,
        region,
        disableOffline: true,
        auth: {
          type: AUTH_TYPE.API_KEY,
          apiKey,
        },
      });
    };

    const createSong = async (
        name: string, genre: string
    ): Promise<any> => {
        const createMutation = /* GraphQL */ `
            mutation CreateSong($input: CreateSongInput!, $condition: ModelSongConditionInput) {
                createSong(input: $input, condition: $condition) {
                    id
                    name
                    genre
                    _lastChangedAt
                    _version
                    _deleted
                }
            }
        `;

        const createInput = {
            input: {
                name: name,
                genre: genre
            },
        };

        const result: any = await appSyncClient.mutate({
            mutation: gql(createMutation),
            fetchPolicy: 'no-cache',
            variables: createInput,
        });
        return result;
    };

    const updateSong = async (
        id: string, name: string, genre: string, version: number
    ): Promise<any> => {
        const updateMutation = /* GraphQL */ `
            mutation UpdateSong($input: UpdateSongInput!, $condition: ModelSongConditionInput) {
                updateSong(input: $input, condition: $condition) {
                    id
                    name
                    genre
                    _lastChangedAt
                    _version
                    _deleted
                }
            }
        `;

        const updateInput = {
            input: {
                id: id,
                name: name,
                genre: genre,
                _version: version
            },
        };

        const result: any = await appSyncClient.mutate({
            mutation: gql(updateMutation),
            fetchPolicy: 'no-cache',
            variables: updateInput,
        });
        return result;
    };

    const syncSongs = async (lastSync?: number): Promise<any> => {
        const syncQuery = /* GraphQL */ `
            query SyncSongs($limit: Int, $lastSync: AWSTimestamp) {
                syncSongs(limit: $limit, lastSync: $lastSync) {
                    items {
                        id
                        name
                        genre
                        _version
                        _lastChangedAt
                    }
                    startedAt
                }
            }
        `;

        const syncQueryInput = {
            input: {
                limit: 10,
                lastSync: lastSync ? lastSync : null
            },
        };

        const result: any = await appSyncClient.query({
            query: gql(syncQuery),
            fetchPolicy: 'no-cache',
            variables: syncQueryInput,
        });
        return result;
    };
});
