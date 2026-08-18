# DRAFT / RFC: opt-in "slim" (unbundled) construct build

> Status: **draft for maintainer discussion** — not intended to change any
> default publish behavior as-is.

## Motivation

`@aws-amplify/data-construct` and `@aws-amplify/graphql-api-construct` ship their
non-jsii dependency closure via `bundledDependencies` (derived from each
package's `nonJsiiDependencies.json`, enforced by
`scripts/verify-construct-dependencies.ts`). That closure is large: each
construct unpacks to roughly **225 MB / ~480 nested files**.

For pure-npm / TypeScript consumers (e.g.
[`aws-amplify/amplify-backend`](https://github.com/aws-amplify/amplify-backend)),
this dominates `npm install` time — and is ~2x worse on Windows CI, where
antivirus scans every extracted file on close. Because the dependencies are
physically inside the published tarball, consumers **cannot** opt out with
`overrides` / `resolutions` (see
[#3464](https://github.com/aws-amplify/amplify-category-api/issues/3464)).

Key observation: every bundled dependency is **also** declared as a normal
`dependencies` entry. So for a pure-npm consumer, an *unbundled* tarball
resolves the exact same packages and versions from the registry (npm
hoists/dedupes them normally) — a smaller, faster install with identical
resolved code, and one that consumers can patch via `overrides`.

## What this PR adds

A single additive, opt-in script — `scripts/pack-slim-construct.ts`
(root script `yarn pack-slim-construct <constructPackageDir>`):

1. Copies the already-built construct package dir to a temp location (never
   mutating the source or the default build artifact).
2. Removes `bundledDependencies` from the **copy's** `package.json` (leaving
   `dependencies` intact) and annotates it (`amplifySlimBuild: true`).
3. `npm pack`s the copy to emit a slim `.tgz`.

The default `bundledDependencies` build — what every existing customer and
every jsii/multi-language target consumes — is **untouched**. This is purely a
way to *produce and measure* a slim artifact.

## Explicitly out of scope for this draft (maintainer decisions)

- **How to publish** the slim artifact so existing customers see no change:
  a separate `@aws-amplify/*-slim` package name, or an opt-in `slim` dist-tag.
- Whether/which jsii language targets must retain bundling (today both packages
  build with jsii but declare `"targets": {}`, i.e. JS/TS only).
- Wiring the slim pack into the release pipeline and adding a size/regression
  check.

## Compatibility

- Default publish path, CI, and `verify-construct-dependencies` are unchanged.
- Slim variant is byte-identical in *resolved* dependency versions for a
  pure-npm consumer (same `dependencies`), differing only in delivery
  (registry-resolved vs. tarball-embedded).
