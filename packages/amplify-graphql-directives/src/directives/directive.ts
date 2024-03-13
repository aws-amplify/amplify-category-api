export interface Directive {
  readonly name: string;
  readonly definition: string;
  readonly defaults: {
    [field: string]: any;
  };
}
