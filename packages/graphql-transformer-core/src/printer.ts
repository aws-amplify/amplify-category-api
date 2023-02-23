export type IPrinter = {
  debug: (line: string) => void;
  info: (line: string, color?: 'green' | 'blue' | 'yellow' | 'red' | 'reset') => void;
  blankLine: () => void;
  success: (line: string) => void;
  warn: (line: string) => void;
  error: (line: string) => void;
};
