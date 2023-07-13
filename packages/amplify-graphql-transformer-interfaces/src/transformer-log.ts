export enum TransformerLogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}
export type TransformerLog = {
  message: string;
  level: TransformerLogLevel;
};
