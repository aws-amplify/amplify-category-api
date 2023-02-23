export type Color = 'green' | 'blue' | 'yellow' | 'red' | 'reset';

/**
 * Printer interface which can either be implemented by the Amplify printer, console, etc.
 */
export type IPrinter = {
  debug: (line: string) => void;
  info: (line: string, color?: Color) => void;
  blankLine: () => void;
  success: (line: string) => void;
  warn: (line: string) => void;
  error: (line: string) => void;
};
