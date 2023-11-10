export type DBEngineType = 'MySQL' | 'Postgres' | 'DynamoDB';

export class Engine {
  constructor(public type: DBEngineType) {}
}
