export type JSONSchema = {
  type?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: (string | number | boolean | null)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  description?: string;
  default?: JSONLike;
  additionalProperties?: boolean | JSONSchema;
  definitions?: Record<string, JSONSchema>;
  $ref?: string;
  $defs?: Record<string, JSONSchema>;
};

type JSONLike = string | number | boolean | null | { [key: string]: JSONLike } | JSONLike[];
