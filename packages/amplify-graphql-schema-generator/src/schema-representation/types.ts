export type FieldType = DefaultType | CustomType | ListType | NonNullType | EnumType;

export type FieldDataType =
  | 'String'
  | 'ID'
  | 'Int'
  | 'Float'
  | 'AWSJSON'
  | 'AWSDate'
  | 'AWSTime'
  | 'AWSDateTime'
  | 'AWSTimestamp'
  | 'ENUM'
  | 'Boolean'
  | 'AWSEmail'
  | 'AWSPhone'
  | 'AWSURL'
  | 'AWSIPAddress';

export interface DefaultType {
  readonly kind: 'Scalar';
  readonly name: FieldDataType;
}

export interface CustomType {
  readonly kind: 'Custom';
  readonly name: string;
}

export interface ListType {
  readonly kind: 'List';
  readonly type: FieldType;
}

export interface NonNullType {
  readonly kind: 'NonNull';
  readonly type: DefaultType | CustomType | ListType | EnumType;
}

export interface EnumType {
  readonly kind: 'Enum';
  name: string;
  readonly values: string[];
}

export interface DefaultValue {
  readonly kind: 'DB_GENERATED' | 'TRANSFORMER_GENERATED';
  readonly value: string | number | boolean;
}

export class Field {
  public default: DefaultValue | undefined = undefined;

  public length: number | null | undefined;

  constructor(public name: string, public type: FieldType) {}
}

export class Index {
  private fields: string[] = [];

  constructor(public name: string) {}

  public getFields(): string[] {
    return this.fields;
  }

  public setFields(fields: string[]): void {
    this.fields = [...fields];
  }
}

export class Model {
  private fields: Field[] = [];

  private primaryKey: Index | undefined = undefined;

  private indexes: Index[] = [];

  constructor(private name: string) {}

  public getName(): string {
    return this.name;
  }

  public addField(field: Field): void {
    if (this.hasField(field.name)) {
      throw new Error(`Field "${field.name}" already exists.`);
    }
    this.fields.push(field);
  }

  public hasField(name: string): boolean {
    return this.fields.some((f) => f.name === name);
  }

  public setPrimaryKey(fields: string[]): void {
    const primaryKey = new Index('PRIMARY_KEY');
    primaryKey.setFields(fields);
    this.primaryKey = primaryKey;
  }

  public getPrimaryKey(): Index | undefined {
    return this.primaryKey;
  }

  public getIndexes(): Index[] {
    return this.indexes;
  }

  public addIndex(name: string, fields: string[]): void {
    if (this.hasIndex(name)) {
      throw new Error(`Index "${name}" already exists.`);
    }
    const index = new Index(name);
    index.setFields(fields);
    this.indexes.push(index);
  }

  public hasIndex(name: string): boolean {
    return this.indexes.some((i) => i.name === name);
  }

  public getFields(): Field[] {
    return this.fields;
  }
}
