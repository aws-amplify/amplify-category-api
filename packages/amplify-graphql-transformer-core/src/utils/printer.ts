/* eslint-disable class-methods-use-this */
import { IPrinter, Color } from '@aws-amplify/graphql-transformer-interfaces';

/**
 * No-op printer that uses console.
 */
export class ConsolePrinter implements IPrinter {
  debug(line: string): void {
    console.debug(line);
  }

  info(line: string, _?: Color): void {
    console.info(line);
  }

  blankLine(): void {
    console.log();
  }

  success(line: string): void {
    console.log(line);
  }

  warn(line: string): void {
    console.warn(line);
  }

  error(line: string): void {
    console.error(line);
  }
}

export const consolePrinter = new ConsolePrinter();
