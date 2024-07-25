import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { DefaultValueTransformer } from '@aws-amplify/graphql-default-value-transformer';
import { FunctionTransformer } from '@aws-amplify/graphql-function-transformer';
import { HttpTransformer } from '@aws-amplify/graphql-http-transformer';
import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { PredictionsTransformer } from '@aws-amplify/graphql-predictions-transformer';
import {
  BelongsToTransformer,
  HasManyTransformer,
  HasOneTransformer,
  ManyToManyTransformer,
} from '@aws-amplify/graphql-relational-transformer';
import { SearchableModelTransformer } from '@aws-amplify/graphql-searchable-transformer';
import { ConflictHandlerType } from '@aws-amplify/graphql-transformer-core';
import { TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { schemas, TransformerPlatform, TransformerSchema, TransformerVersion } from '..';

for (const [name, schema] of Object.entries(schemas)) {
  test(`schema '${name}' passes or fails as expected`, () => {
    if (!isTransformerVersionSupported(schema, TransformerVersion.v2)) {
      throw new Error('only v2 schemas are currently supported');
    }

    if (isPlatformSupported(schema, TransformerPlatform.api)) {
      expectToPass(name, () =>
        testTransform({
          schema: schema.sdl,
          transformers: getV2DefaultTransformerList(),
        }),
      );
    } else {
      expectToFail(name, () =>
        testTransform({
          schema: schema.sdl,
          transformers: getV2DefaultTransformerList(),
        }),
      );
    }

    if (isPlatformSupported(schema, TransformerPlatform.dataStore)) {
      expectToPass(name, () =>
        testTransform({
          schema: schema.sdl,
          transformers: getV2DefaultTransformerList(),
          resolverConfig: {
            project: {
              ConflictDetection: 'VERSION',
              ConflictHandler: ConflictHandlerType.AUTOMERGE,
            },
          },
        }),
      );
    } else {
      expectToFail(name, () =>
        testTransform({
          schema: schema.sdl,
          transformers: getV2DefaultTransformerList(),
          resolverConfig: {
            project: {
              ConflictDetection: 'VERSION',
              ConflictHandler: ConflictHandlerType.AUTOMERGE,
            },
          },
        }),
      );
    }
  });
}

const expectToPass = (name: string, transform: () => any): void => {
  try {
    transform();
  } catch (err) {
    console.log(err);
    throw new Error(`schema '${name}' unexpectedly failed with error: ${err}`);
  }
};

const expectToFail = (name: string, transform: () => any): void => {
  try {
    transform();
  } catch (err) {
    return;
  }

  throw new Error(`schema '${name}' unexpectedly passed`);
};

const getV2DefaultTransformerList = (): TransformerPluginProvider[] => {
  const modelTransformer = new ModelTransformer();
  const indexTransformer = new IndexTransformer();
  const hasOneTransformer = new HasOneTransformer();
  const authTransformer = new AuthTransformer();

  return [
    modelTransformer,
    new FunctionTransformer(),
    new HttpTransformer(),
    new PredictionsTransformer({ bucketName: 'testBucketName' }),
    new PrimaryKeyTransformer(),
    indexTransformer,
    new BelongsToTransformer(),
    new HasManyTransformer(),
    hasOneTransformer,
    new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer),
    new DefaultValueTransformer(),
    authTransformer,
    new SearchableModelTransformer(),
  ];
};

const isTransformerVersionSupported = (schema: TransformerSchema, version: TransformerVersion): boolean => {
  return (schema.transformerVersion & version) !== 0;
};

const isPlatformSupported = (schema: TransformerSchema, platform: TransformerPlatform): boolean => {
  return (schema.supportedPlatforms & platform) !== 0;
};
