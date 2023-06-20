import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { convertToResolverConfig } from '../../internal/conflict-resolution';
import { ProjectConflictResolution } from '../../types';

describe('convertToResolverConfig', () => {
  it('converts a project-level config', () => {
    const config: ProjectConflictResolution = {
      project: {
        handlerType: 'AUTOMERGE',
        detectionType: 'VERSION',
      },
    };
    expect(convertToResolverConfig(config)).toEqual({
      project: {
        ConflictHandler: 'AUTOMERGE',
        ConflictDetection: 'VERSION',
      },
    });
  });

  it('converts a model-level config', () => {
    const config: ProjectConflictResolution = {
      project: {
        handlerType: 'AUTOMERGE',
        detectionType: 'VERSION',
      },
      models: {
        Todo: {
          handlerType: 'OPTIMISTIC_CONCURRENCY',
          detectionType: 'VERSION',
        },
      },
    };
    expect(convertToResolverConfig(config)).toEqual({
      project: {
        ConflictHandler: 'AUTOMERGE',
        ConflictDetection: 'VERSION',
      },
      models: {
        Todo: {
          ConflictHandler: 'OPTIMISTIC_CONCURRENCY',
          ConflictDetection: 'VERSION',
        },
      },
    });
  });

  it('converts custom conflict resolution config', () => {
    const config: ProjectConflictResolution = {
      project: {
        handlerType: 'LAMBDA',
        detectionType: 'VERSION',
        conflictHandler: {
          functionName: 'CustomLambdaName',
          functionArn: 'CustomLambdaArn',
        } as IFunction,
      },
    };
    expect(convertToResolverConfig(config)).toEqual({
      project: {
        ConflictHandler: 'LAMBDA',
        ConflictDetection: 'VERSION',
        LambdaConflictHandler: {
          name: 'CustomLambdaName',
          lambdaArn: 'CustomLambdaArn',
        },
      },
    });
  });
});