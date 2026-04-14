export class HttpError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "HttpError";
    // Unified shape for API error middleware.
    this.statusCode = statusCode;
    this.code = code;
  }
}
