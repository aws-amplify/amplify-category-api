/**
 * Exception class for Invalid Directive errors
 */
export class InvalidDirectiveError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidDirectiveError.prototype);
    this.name = 'InvalidDirectiveError';
  }
}
