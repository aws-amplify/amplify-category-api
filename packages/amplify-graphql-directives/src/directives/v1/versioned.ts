import { Directive } from '../directive';

export type VersionedDirectiveDefaults = { versionField: string; versionInput: string };
const name = 'versioned';
const defaults: VersionedDirectiveDefaults = {
  versionField: 'version',
  versionInput: 'expectedVersion',
};
const definition = /* GraphQL */ `
  directive @${name}(versionField: String = "${defaults.versionField}", versionInput: String = "${defaults.versionInput}") on OBJECT
`;

export const VersionedDirective: Directive<VersionedDirectiveDefaults> = {
  name,
  definition,
  defaults,
};
