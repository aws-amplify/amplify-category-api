import { Directive } from '../directive';

const name = 'versioned';
const defaults = {
  versionField: 'version',
  versionInput: 'expectedVersion',
};
const definition = /* GraphQL */ `
  directive @${name}(versionField: String = "${defaults.versionField}", versionInput: String = "${defaults.versionInput}") on OBJECT
`;

export const VersionedDirective: Directive = {
  name,
  definition,
  defaults,
};
