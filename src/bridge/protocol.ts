export class InspectedWindowEvalError extends Error {
  readonly exception: unknown;

  constructor(exception: unknown) {
    super('Failed to execute script in inspected window');
    this.name = 'InspectedWindowEvalError';
    this.exception = exception;
  }
}
