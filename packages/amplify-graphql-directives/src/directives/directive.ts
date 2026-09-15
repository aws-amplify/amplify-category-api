export interface DirectiveDefaults {}

export interface Directive<Defaults extends DirectiveDefaults = DirectiveDefaults> {
  readonly name: string;
  readonly definition: string;
  readonly defaults: Defaults;
}
