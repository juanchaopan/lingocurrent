export class ApplicationError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(
    code:
      | 'UNAUTHENTICATED'
      | 'NOT_A_MEMBER'
      | 'NOT_FOUND'
      | 'INVALID_INPUT'
      | 'OPERATION_MISMATCH'
      | 'FORBIDDEN'
      | 'UNAVAILABLE',
    message: string,
    status: number,
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
