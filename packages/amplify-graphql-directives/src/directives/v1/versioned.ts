import { Directive } from '../directive';

export type VersionedDirectiveV1Defaults = { versionField: string; versionInput: string };
const name = 'versioned';
const defaults: VersionedDirectiveV1Defaults = {
  versionField: 'version',
  versionInput: 'expectedVersion',
};
const definition = /* GraphQL */ `
  directive @${name}(versionField: String = "${defaults.versionField}", versionInput: String = "${defaults.versionInput}") on OBJECT
`;

export const VersionedDirectiveV1: Directive<VersionedDirectiveV1Defaults> = {
  name,
  definition,
  defaults,
};
