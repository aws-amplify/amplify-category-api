import { computeDepsClosure, getLockfileDependencies } from '../verify-construct-dependencies';

describe('verify construct dependencies lockfile diagnostics', () => {
  it('reports the missing yarn.lock descriptor when a registry dependency cannot be resolved', () => {
    expect(() =>
      computeDepsClosure(['missing-package@^1.0.0'], {
        repoPackageClosures: {},
        lockfileContents: {},
      }),
    ).toThrow(/Missing yarn\.lock resolution for package descriptor "missing-package@\^1\.0\.0".*Run `yarn`.*commit.*yarn\.lock/);
  });

  it('reports the descriptor with a malformed dependency entry', () => {
    expect(() =>
      getLockfileDependencies(
        {
          'broken-package@^1.0.0': {
            dependencies: {
              child: 123,
            },
          },
        },
        'broken-package@^1.0.0',
        ['broken-package'],
      ),
    ).toThrow(/Malformed yarn\.lock resolution for package descriptor "broken-package@\^1\.0\.0".*child.*string version descriptor/);
  });

  it('keeps the valid lockfile success path', () => {
    const closure = computeDepsClosure(['parent@^1.0.0'], {
      repoPackageClosures: {},
      lockfileContents: {
        'parent@^1.0.0': {
          dependencies: {
            child: '^2.0.0',
          },
        },
        'child@^2.0.0': {},
      },
    });

    expect(closure).toEqual({
      repoDeps: [],
      registryDeps: ['parent@^1.0.0', 'child@^2.0.0'],
    });
  });
});
