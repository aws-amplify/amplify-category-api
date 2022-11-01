export type DBEngineType = 'MySQL' | 'DynamoDB';

export class Engine {
  constructor(public type: DBEngineType) {
  }
}
