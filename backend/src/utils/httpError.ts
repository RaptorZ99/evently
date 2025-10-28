import { StatusCodes } from 'http-status-codes';

export class HttpError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }

  static badRequest(message: string) {
    return new HttpError(StatusCodes.BAD_REQUEST, message);
  }

  static notFound(message: string) {
    return new HttpError(StatusCodes.NOT_FOUND, message);
  }

  static conflict(message: string) {
    return new HttpError(StatusCodes.CONFLICT, message);
  }
}
