export type ResolverDirectiveConfiguration = {
  typeName: string;
  fieldName: string;
  functions: ResolverFunction[];
};

export type ResolverFunction = {
  dataSource: string;
  entry: string;
};
